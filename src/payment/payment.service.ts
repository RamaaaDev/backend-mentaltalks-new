/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrisService } from './qris.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { MeetingService } from '../meeting/meeting.service';
import { NotificationReferenceType, Prisma } from '@prisma/client';
import type {
  CreatePaymentIntentDto,
  AdminConfirmPaymentDto,
  PaymentStatus,
  PaymentMeta,
} from './interface/payment.interface';

export type { AdminConfirmPaymentDto };

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private midtrans: QrisService, // nama field sengaja dibiarkan 'midtrans'
    private configService: ConfigService, // agar tidak ada breaking change di sini
    private meetingService: MeetingService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE PAYMENT
  // ══════════════════════════════════════════════════════════════════════════

  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    // 1. Validasi schedule
    const schedule = await this.prisma.schedule.findUnique({
      where: { schedule_id: dto.scheduleId },
      include: { schedule_booking: true },
    });

    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');
    if (schedule.schedule_isBooked) {
      throw new ConflictException('Jadwal sudah dibooking oleh user lain');
    }
    if (schedule.schedule_startTime < new Date()) {
      throw new BadRequestException('Jadwal sudah terlewat');
    }

    // 2. Validasi & hitung kupon (belum di-consume)
    let finalPrice = schedule.schedule_price;
    let couponId: string | null = null;

    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { coupon_code: dto.couponCode },
      });

      if (!coupon || !coupon.coupon_isActive)
        throw new BadRequestException('Kupon tidak valid atau tidak aktif');
      if (coupon.coupon_expiresAt < new Date())
        throw new BadRequestException('Kupon sudah kedaluwarsa');
      if (coupon.coupon_minPurchase && finalPrice < coupon.coupon_minPurchase)
        throw new BadRequestException(
          `Minimum pembelian untuk kupon ini adalah Rp ${coupon.coupon_minPurchase.toLocaleString('id-ID')}`,
        );
      if (
        coupon.coupon_usageLimit &&
        coupon.coupon_usedCount >= coupon.coupon_usageLimit
      )
        throw new BadRequestException('Kupon sudah mencapai batas penggunaan');

      const alreadyUsed = await this.prisma.couponUsage.findUnique({
        where: {
          couponUsage_couponId_couponUsage_userId: {
            couponUsage_couponId: coupon.coupon_id,
            couponUsage_userId: userId,
          },
        },
      });
      if (alreadyUsed)
        throw new BadRequestException(
          'Kamu sudah pernah menggunakan kupon ini',
        );

      if (coupon.coupon_type === 'PERCENTAGE') {
        const discount = Math.floor((finalPrice * coupon.coupon_value) / 100);
        const maxDisc = coupon.coupon_maxDiscount ?? discount;
        finalPrice -= Math.min(discount, maxDisc);
      } else {
        finalPrice -= coupon.coupon_value;
      }

      finalPrice = Math.max(finalPrice, 0);
      couponId = coupon.coupon_id;
    }

    // 3. Ambil data user & psikolog
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_name: true, user_email: true, user_phone: true },
    });

    const psychologist = await this.prisma.psychologistProfile.findUnique({
      where: { psychologist_id: schedule.schedule_psychologistId },
      select: { psychologist_name: true },
    });

    // 4. Generate orderId & ambil info QRIS
    const orderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}-${Date.now()}`;

    const { token, qrisImageUrl } = this.midtrans.createSnapPayment({
      orderId,
      amount: finalPrice,
      buyerName: user?.user_name ?? 'User',
      buyerEmail: user?.user_email ?? '',
      buyerPhone: user?.user_phone ?? '',
      product: `Konsultasi dengan ${psychologist?.psychologist_name}`,
    });

    // 5. Simpan payment intent ke DB
    await this.prisma.payment.create({
      data: {
        orderId,
        token,
        redirectUrl: '', // tidak dipakai untuk QRIS statis
        status: 'PENDING',
        grossAmount: finalPrice,
        meta: {
          userId,
          scheduleId: dto.scheduleId,
          couponId: couponId ?? null,
          bookingNotes: dto.booking_notes ?? null,
          originalPrice: schedule.schedule_price,
          finalPrice,
          psychologistId: schedule.schedule_psychologistId,
          scheduleType: schedule.schedule_type,
        },
      },
    });

    return {
      message: 'Silakan selesaikan pembayaran via QRIS.',
      data: {
        orderId,
        /**
         * snapToken diisi orderId agar response shape tidak berubah
         * bagi frontend yang sudah consume field ini.
         */
        snapToken: token,
        /**
         * URL gambar barcode QRIS statis — tampilkan ke user.
         */
        qrisImageUrl,
        pricing: {
          originalPrice: schedule.schedule_price,
          finalPrice,
          discount: schedule.schedule_price - finalPrice,
        },
        /**
         * Instruksi untuk user
         */
        paymentInstructions: [
          `Transfer sebesar Rp ${finalPrice.toLocaleString('id-ID')} via QRIS di atas.`,
          'Simpan nomor referensi transaksi dari aplikasi bank / e-wallet kamu.',
          `Masukkan nomor referensi tersebut ke aplikasi dengan orderId: ${orderId}.`,
          'Tunggu konfirmasi dari admin (biasanya dalam 1×24 jam kerja).',
        ],
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // KONFIRMASI ADMIN (menggantikan webhook Midtrans)
  // Endpoint: POST /payments/callback
  // Guard: hanya ADMIN yang bisa akses (diatur di controller)
  // ══════════════════════════════════════════════════════════════════════════

  async handleCallback(body: AdminConfirmPaymentDto) {
    // 1. Cari payment
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: body.orderId },
    });
    if (!payment) throw new NotFoundException('Payment tidak ditemukan');

    // 2. Idempotency guard
    if (payment.status === 'SUCCESS') {
      return { message: 'Payment sudah dikonfirmasi sebelumnya' };
    }

    // 3. Map status berdasarkan keputusan admin
    const status: PaymentStatus = this.midtrans.mapStatus(
      body.transactionStatus,
    );

    // 4. Update status payment + simpan nomor referensi di transactionId
    await this.prisma.payment.update({
      where: { orderId: body.orderId },
      data: {
        status,
        transactionId: body.referenceNumber,
        paymentType: 'qris',
        transactionTime: new Date(),
      },
    });

    // 5. Jika dikonfirmasi sukses → buat booking + meeting
    if (status === 'SUCCESS') {
      const meta = payment.meta as unknown as PaymentMeta;

      await this.prisma.$transaction(async (tx) => {
        // Cek ulang schedule masih tersedia (race condition guard)
        const schedule = await tx.schedule.findUnique({
          where: { schedule_id: meta.scheduleId },
          select: { schedule_isBooked: true },
        });

        if (schedule?.schedule_isBooked) {
          await tx.payment.update({
            where: { orderId: body.orderId },
            data: { status: 'REFUNDED' },
          });
          return;
        }

        // Buat booking langsung CONFIRMED
        const booking = await tx.bookingPsychologist.create({
          data: {
            booking_userId: meta.userId,
            booking_psychologistId: meta.psychologistId,
            booking_scheduleId: meta.scheduleId,
            booking_couponId: meta.couponId ?? null,
            booking_type: meta.scheduleType as any,
            booking_notes: meta.bookingNotes ?? null,
            booking_status: 'DONE',
            booking_finalPrice: meta.finalPrice,
          },
        });

        // Hubungkan payment ke booking
        await tx.payment.update({
          where: { orderId: body.orderId },
          data: { bookingId: booking.booking_id },
        });

        // Lock slot
        await tx.schedule.update({
          where: { schedule_id: meta.scheduleId },
          data: { schedule_isBooked: true },
        });

        // Consume kupon
        if (meta.couponId) {
          await tx.coupon.update({
            where: { coupon_id: meta.couponId },
            data: { coupon_usedCount: { increment: 1 } },
          });
          await tx.couponUsage.create({
            data: {
              couponUsage_couponId: meta.couponId,
              couponUsage_userId: meta.userId,
            },
          });
        }

        // Notifikasi ke user
        await tx.notication.create({
          data: {
            notification_userId: meta.userId,
            notification_title: 'Booking Dikonfirmasi',
            notification_body: `Pembayaran QRIS kamu telah dikonfirmasi. Booking konsultasi berhasil.`,
            notification_type: 'PAYMENT',
            notification_referenceId: NotificationReferenceType.BOOKINGID,
          },
        });
      });

      // Buat meeting room setelah transaksi DB selesai
      const updatedPayment = await this.prisma.payment.findUnique({
        where: { orderId: body.orderId },
        select: { bookingId: true },
      });
      if (updatedPayment?.bookingId) {
        await this.meetingService.createMeetingAfterPayment(
          updatedPayment.bookingId,
        );
      }
    }

    return { message: 'Konfirmasi pembayaran berhasil diproses' };
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

    // Untuk QRIS statis tidak ada re-check ke gateway — status ditentukan admin.
    // Cukup kembalikan status saat ini dari DB.
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
  // SUBMIT NOMOR REFERENSI (user)
  // Endpoint: POST /payments/reference
  // User menyimpan nomor referensi setelah bayar QRIS.
  // Status payment tetap PENDING — admin yang akan konfirmasi via /callback.
  // ══════════════════════════════════════════════════════════════════════════

  async submitReferenceNumber(
    userId: string,
    orderId: string,
    referenceNumber: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        status: true,
        meta: true,
      },
    });

    if (!payment) throw new NotFoundException('Payment tidak ditemukan');

    // Pastikan payment ini milik user yang request
    const meta = payment.meta as unknown as PaymentMeta;
    if (meta.userId !== userId) {
      throw new NotFoundException('Payment tidak ditemukan');
    }

    if (payment.status === 'SUCCESS') {
      throw new BadRequestException('Payment sudah dikonfirmasi');
    }

    if (payment.status === 'FAILED' || payment.status === 'EXPIRED') {
      throw new BadRequestException('Payment tidak dapat diproses');
    }

    // Simpan nomor referensi di field transactionId — admin akan lihat ini
    await this.prisma.payment.update({
      where: { orderId },
      data: {
        transactionId: referenceNumber,
        paymentType: 'qris',
      },
    });

    return {
      message:
        'Nomor referensi berhasil disimpan. Admin akan memverifikasi dalam 1×24 jam kerja.',
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
