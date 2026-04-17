import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/booking.dto';
import { BookingStatus, Prisma } from '@prisma/client';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // USER
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Buat booking → validasi schedule → hitung harga + kupon → simpan
   */
  async createBooking(userId: string, dto: CreateBookingDto) {
    // 1. Ambil schedule + pastikan belum dibooking
    const schedule = await this.prisma.schedule.findUnique({
      where: { schedule_id: dto.scheduleId },
      include: { schedule_booking: true, schedule_psychologistProfile: true },
    });

    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');
    if (schedule.schedule_booking) {
      throw new ConflictException('Jadwal sudah dibooking oleh user lain');
    }

    // 2. Pastikan schedule belum lewat
    if (schedule.schedule_startTime < new Date()) {
      throw new BadRequestException('Jadwal sudah terlewat');
    }

    // 3. Hitung harga + kupon
    let finalPrice = schedule.schedule_price;
    let couponId: string | null = null;

    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { coupon_code: dto.couponCode },
      });

      if (!coupon || !coupon.coupon_isActive) {
        throw new BadRequestException('Kupon tidak valid atau tidak aktif');
      }
      if (coupon.coupon_expiresAt < new Date()) {
        throw new BadRequestException('Kupon sudah kedaluwarsa');
      }
      if (coupon.coupon_minPurchase && finalPrice < coupon.coupon_minPurchase) {
        throw new BadRequestException(
          `Minimum pembelian untuk kupon ini adalah Rp ${coupon.coupon_minPurchase.toLocaleString('id-ID')}`,
        );
      }
      if (
        coupon.coupon_usageLimit &&
        coupon.coupon_usedCount >= coupon.coupon_usageLimit
      ) {
        throw new BadRequestException('Kupon sudah mencapai batas penggunaan');
      }

      // Cek apakah user sudah pernah pakai kupon ini
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

      // Hitung diskon
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

    // 4. Buat booking dalam transaksi
    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.bookingPsychologist.create({
        data: {
          booking_userId: userId,
          booking_psychologistId: schedule.schedule_psychologistId,
          booking_scheduleId: schedule.schedule_id,
          booking_couponId: couponId,
          booking_type: schedule.schedule_type,
          booking_notes: dto.booking_notes,
          booking_status: 'PENDING',
        },
        include: {
          booking_schedule: {
            include: {
              schedule_psychologistProfile: true,
              schedule_location: true,
            },
          },
          booking_user: { select: { user_name: true, user_email: true } },
        },
      });

      // Increment coupon used count
      if (couponId) {
        await tx.coupon.update({
          where: { coupon_id: couponId },
          data: { coupon_usedCount: { increment: 1 } },
        });
        await tx.couponUsage.create({
          data: {
            couponUsage_couponId: couponId,
            couponUsage_userId: userId,
          },
        });
      }

      return newBooking;
    });

    return {
      message: 'Booking berhasil dibuat. Silakan lanjutkan ke pembayaran.',
      data: {
        booking,
        pricing: {
          originalPrice: schedule.schedule_price,
          finalPrice,
          discount: schedule.schedule_price - finalPrice,
        },
      },
    };
  }

  /**
   * Daftar booking milik user sendiri
   */
  async getMyBookings(
    userId: string,
    page = 1,
    limit = 10,
    status?: BookingStatus,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.BookingPsychologistWhereInput = {
      booking_userId: userId,
    };
    if (status) where.booking_status = status;

    const [data, total] = await Promise.all([
      this.prisma.bookingPsychologist.findMany({
        where,
        include: {
          booking_schedule: {
            include: {
              schedule_psychologistProfile: {
                select: {
                  psychologist_name: true,
                  psychologist_specialties: true,
                  psychologist_user: { select: { user_photos: true } },
                },
              },
              schedule_location: {
                select: { location_name: true, location_address: true },
              },
            },
          },
          booking_payment: {
            select: { status: true, grossAmount: true, orderId: true },
          },
          booking_meetingRoom: {
            select: {
              meeting_id: true,
              meeting_status: true,
              meeting_scheduleAt: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { booking_createdAt: 'desc' },
      }),
      this.prisma.bookingPsychologist.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Detail booking by ID — validasi kepemilikan
   */
  async getBookingDetail(userId: string, bookingId: string, userRole: string) {
    const booking = await this.prisma.bookingPsychologist.findUnique({
      where: { booking_id: bookingId },
      include: {
        booking_schedule: {
          include: {
            schedule_psychologistProfile: true,
            schedule_location: true,
          },
        },
        booking_user: {
          select: {
            user_id: true,
            user_name: true,
            user_email: true,
            user_photos: true,
          },
        },
        booking_payment: true,
        booking_meetingRoom: true,
        booking_coupon: {
          select: { coupon_code: true, coupon_type: true, coupon_value: true },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking tidak ditemukan');

    // User hanya bisa lihat booking sendiri, psikolog bisa lihat booking ke dia
    if (
      (userRole === 'USER' && booking.booking_userId !== userId) ||
      (userRole === 'PSYCHOLOGIST' && booking.booking_psychologistId !== userId)
    ) {
      throw new NotFoundException('Booking tidak ditemukan');
    }

    return { data: booking };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PSYCHOLOGIST
  // ══════════════════════════════════════════════════════════════════════════

  async getPsychologistBookings(
    psychologistUserId: string,
    page = 1,
    limit = 10,
    status?: BookingStatus,
  ) {
    // Cari psychologist_id dari userId
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: { psychologist_userId: psychologistUserId },
      select: { psychologist_id: true },
    });
    if (!profile)
      throw new NotFoundException('Profil psikolog tidak ditemukan');

    const skip = (page - 1) * limit;
    const where: Prisma.BookingPsychologistWhereInput = {
      booking_psychologistId: profile.psychologist_id,
    };
    if (status) where.booking_status = status;

    const [data, total] = await Promise.all([
      this.prisma.bookingPsychologist.findMany({
        where,
        include: {
          booking_user: {
            select: {
              user_id: true,
              user_name: true,
              user_email: true,
              user_photos: true,
            },
          },
          booking_schedule: {
            select: {
              schedule_startTime: true,
              schedule_endTime: true,
              schedule_type: true,
              schedule_price: true,
            },
          },
          booking_payment: { select: { status: true, grossAmount: true } },
          booking_meetingRoom: {
            select: { meeting_id: true, meeting_status: true },
          },
        },
        skip,
        take: limit,
        orderBy: { booking_createdAt: 'desc' },
      }),
      this.prisma.bookingPsychologist.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN
  // ══════════════════════════════════════════════════════════════════════════

  async adminGetAllBookings(page = 1, limit = 10, status?: BookingStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.BookingPsychologistWhereInput = {};
    if (status) where.booking_status = status;

    const [data, total] = await Promise.all([
      this.prisma.bookingPsychologist.findMany({
        where,
        include: {
          booking_user: { select: { user_name: true, user_email: true } },
          booking_schedule: {
            include: {
              schedule_psychologistProfile: {
                select: { psychologist_name: true },
              },
            },
          },
          booking_payment: {
            select: { status: true, grossAmount: true, orderId: true },
          },
        },
        skip,
        take: limit,
        orderBy: { booking_createdAt: 'desc' },
      }),
      this.prisma.bookingPsychologist.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminUpdateBookingStatus(bookingId: string, status: BookingStatus) {
    const booking = await this.prisma.bookingPsychologist.findUnique({
      where: { booking_id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking tidak ditemukan');

    const updated = await this.prisma.bookingPsychologist.update({
      where: { booking_id: bookingId },
      data: { booking_status: status },
    });

    return { message: `Status booking diubah ke ${status}`, data: updated };
  }
}
