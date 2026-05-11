/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MidtransService } from './midtrans.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { MeetingService } from '../meeting/meeting.service';
import { NotificationReferenceType, Prisma } from '@prisma/client';
import type {
  MidtransNotificationBody,
  PaymentStatus,
} from './interface/payment.interface';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private midtrans: MidtransService,
    private configService: ConfigService,
    private meetingService: MeetingService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE PAYMENT
  // ══════════════════════════════════════════════════════════════════════════

  async createPayment(userId: string, bookingId: string) {
    // 1. Ambil booking
    const booking = await this.prisma.bookingPsychologist.findUnique({
      where: { booking_id: bookingId },
      include: {
        booking_payment: true,
        booking_schedule: true,
        booking_user: {
          select: { user_name: true, user_email: true, user_phone: true },
        },
        booking_psychologist: { select: { psychologist_name: true } },
        booking_coupon: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking tidak ditemukan');
    if (booking.booking_userId !== userId)
      throw new NotFoundException('Booking tidak ditemukan');
    if (booking.booking_payment)
      throw new ConflictException('Payment sudah dibuat untuk booking ini');
    if (booking.booking_status !== 'PENDING') {
      throw new BadRequestException('Booking tidak dalam status PENDING');
    }

    // 2. Hitung harga final (ulang dari schedule + kupon)
    let amount = booking.booking_schedule.schedule_price;
    if (booking.booking_coupon) {
      const c = booking.booking_coupon;
      if (c.coupon_type === 'PERCENTAGE') {
        const disc = Math.floor((amount * c.coupon_value) / 100);
        amount -= c.coupon_maxDiscount
          ? Math.min(disc, c.coupon_maxDiscount)
          : disc;
      } else {
        amount -= c.coupon_value;
      }
      amount = Math.max(amount, 0);
    }

    // 3. Generate orderId unik
    const orderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}-${Date.now()}`;
    const appUrl = this.configService.get<string>(
      'APP_URL',
      'https://www.mentaltalks.co.id',
    );

    // 4. Buat Snap payment di Midtrans
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { token, redirectUrl } = await this.midtrans.createSnapPayment({
      orderId,
      amount,
      buyerName: booking.booking_user.user_name ?? 'User',
      buyerEmail: booking.booking_user.user_email ?? '',
      buyerPhone: booking.booking_user.user_phone ?? '',
      product: `Konsultasi dengan ${booking.booking_psychologist.psychologist_name}`,
      returnUrl: `${appUrl}/payments/return?orderId=${orderId}`,
      cancelUrl: `${appUrl}/payments/cancel?orderId=${orderId}`,
    });

    // 5. Simpan payment ke DB
    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        orderId,
        token,
        redirectUrl,
        status: 'PENDING',
        grossAmount: amount,
        meta: { snapToken: token },
      },
    });

    // 6. Kirim notifikasi
    await this.prisma.notication.create({
      data: {
        notification_userId: userId,
        notification_title: 'Pembayaran Menunggu',
        notification_body: `Selesaikan pembayaran sebesar Rp ${amount.toLocaleString('id-ID')} untuk booking konsultasi Anda.`,
        notification_type: 'PAYMENT',
        notification_referenceId: NotificationReferenceType.BOOKINGID,
      },
    });

    return {
      message:
        'Payment berhasil dibuat. Silakan lanjutkan ke halaman pembayaran.',
      data: {
        paymentId: payment.id,
        orderId,
        amount,
        snapToken: token,
        redirectUrl,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CALLBACK dari Midtrans (webhook / HTTP Notification)
  // ══════════════════════════════════════════════════════════════════════════

  async handleCallback(body: MidtransNotificationBody) {
    // 1. Verifikasi signature key
    const isValid = this.midtrans.verifySignature(body);
    if (!isValid) {
      throw new UnauthorizedException('Signature tidak valid');
    }

    const orderId = body.order_id;

    // 2. Cari payment
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    if (!payment) return { message: 'Payment tidak ditemukan' };

    // 3. Map status
    const status: PaymentStatus = this.midtrans.mapStatus(
      body.transaction_status,
      body.fraud_status,
    );

    // 4. Update payment
    await this.prisma.payment.update({
      where: { orderId },
      data: {
        status,
        transactionId: body.transaction_id,
        paymentType: body.payment_type ?? null,
        transactionTime: new Date(body.transaction_time),
      },
    });

    // 5. Jika sukses → update booking + buat meeting room
    if (status === 'SUCCESS' && payment.bookingId) {
      await this.prisma.bookingPsychologist.update({
        where: { booking_id: payment.bookingId },
        data: { booking_status: 'PROGRESS' },
      });

      await this.meetingService.createMeetingAfterPayment(payment.bookingId);
    }

    return { message: 'Callback diterima' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CEK STATUS (user trigger manual)
  // ══════════════════════════════════════════════════════════════════════════

  async checkPaymentStatus(userId: string, orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { booking: { select: { booking_userId: true } } },
    });

    if (!payment) throw new NotFoundException('Payment tidak ditemukan');
    if (payment.booking?.booking_userId !== userId) {
      throw new NotFoundException('Payment tidak ditemukan');
    }

    // Jika masih pending → re-check ke Midtrans
    if (payment.status === 'PENDING') {
      const { status, transactionId, paymentType } =
        await this.midtrans.checkTransactionStatus(orderId);

      if (status !== 'PENDING') {
        await this.prisma.payment.update({
          where: { orderId },
          data: {
            status,
            ...(transactionId && { transactionId }),
            ...(paymentType && { paymentType }),
          },
        });

        if (status === 'SUCCESS' && payment.bookingId) {
          await this.prisma.bookingPsychologist.update({
            where: { booking_id: payment.bookingId },
            data: { booking_status: 'PROGRESS' },
          });
          await this.meetingService.createMeetingAfterPayment(
            payment.bookingId,
          );
        }

        payment.status = status;
      }
    }

    return { data: payment };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET MY PAYMENTS
  // ══════════════════════════════════════════════════════════════════════════

  async getMyPayments(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { booking: { booking_userId: userId } },
        include: {
          booking: {
            select: {
              booking_type: true,
              booking_schedule: {
                select: {
                  schedule_startTime: true,
                  schedule_psychologistProfile: {
                    select: { psychologist_name: true },
                  },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({
        where: { booking: { booking_userId: userId } },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN: GET ALL PAYMENTS
  // ══════════════════════════════════════════════════════════════════════════

  async adminGetAllPayments(page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              booking_user: { select: { user_name: true, user_email: true } },
              booking_psychologist: { select: { psychologist_name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
