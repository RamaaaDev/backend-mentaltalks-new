import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IpaymuService } from './ipaymu.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { MeetingService } from '../meeting/meeting.service';
import { IpaymuCallbackBody } from './interface/payment.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private ipaymu: IpaymuService,
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

    // 4. Buat payment di iPaymu
    const { paymentUrl, sessionId, trxId } =
      await this.ipaymu.createRedirectPayment({
        orderId,
        amount,
        buyerName: booking.booking_user.user_name ?? 'User',
        buyerEmail: booking.booking_user.user_email ?? '',
        buyerPhone: booking.booking_user.user_phone ?? '',
        product: `Konsultasi dengan ${booking.booking_psychologist.psychologist_name}`,
        returnUrl: `${appUrl}/payment/return?orderId=${orderId}`,
        cancelUrl: `${appUrl}/payment/cancel?orderId=${orderId}`,
        notifyUrl: `https://api.mentaltalks.co.id/api/payments/callback`,
      });

    // 5. Simpan payment ke DB
    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        orderId,
        token: sessionId ?? '',
        redirectUrl: paymentUrl,
        status: 'PENDING',
        grossAmount: amount,
        ...(trxId && { transactionId: trxId }),
        meta: {
          ipaymuSessionId: sessionId,
          ...(trxId && { trxId }),
        },
      },
    });

    // 6. Kirim notifikasi
    await this.prisma.notication.create({
      data: {
        notification_userId: userId,
        notification_title: 'Pembayaran Menunggu',
        notification_body: `Selesaikan pembayaran sebesar Rp ${amount.toLocaleString('id-ID')} untuk booking konsultasi Anda.`,
        notification_type: 'PAYMENT',
        notification_referenceId: 'BOOKINGID',
      },
    });

    return {
      message:
        'Payment berhasil dibuat. Silakan lanjutkan ke halaman pembayaran.',
      data: {
        paymentId: payment.id,
        orderId,
        amount,
        redirectUrl: paymentUrl,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CALLBACK dari iPaymu (webhook)
  // ══════════════════════════════════════════════════════════════════════════

  async handleCallback(body: IpaymuCallbackBody) {
    const { sid: orderId, trx_id: trxId, status: statusCode } = body;

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    if (!payment) return { message: 'Payment tidak ditemukan' };

    let status: string;
    console.log('CALLBACK BODY:', body);
    const statusStr = (statusCode ?? '').toLowerCase();
    if (['berhasil', 'success', 'sukses'].includes(statusStr)) {
      status = 'SUCCESS';
    } else if (statusStr === 'pending') {
      status = 'PENDING';
    } else if (statusStr === 'expired') {
      status = 'EXPIRED';
    } else {
      // fallback: coba mapping by number (status_code)
      status = this.ipaymu.mapStatus(Number(body.status_code));
    }

    // Update payment
    await this.prisma.payment.update({
      where: { orderId },
      data: {
        status,
        transactionId: trxId,
        paymentType: body.payment_method ?? null,
        transactionTime: new Date(),
      },
    });

    // Jika sukses → update booking + buat meeting room
    if (status === 'SUCCESS' && payment.bookingId) {
      await this.prisma.bookingPsychologist.update({
        where: { booking_id: payment.bookingId },
        data: { booking_status: 'PROGRESS' },
      });

      // Buat MeetingRoom otomatis
      await this.meetingService.createMeetingAfterPayment(payment.bookingId);
    }

    // Jika gagal/expired → tetap PENDING, user bisa retry
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

    // Jika masih pending → re-check ke iPaymu
    if (payment.status === 'PENDING' && payment.transactionId) {
      const { status } = await this.ipaymu.checkTransactionStatus(
        payment.transactionId,
      );
      if (status !== 'PENDING') {
        await this.prisma.payment.update({
          where: { orderId },
          data: { status },
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
