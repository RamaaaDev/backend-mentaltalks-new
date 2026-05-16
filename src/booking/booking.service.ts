import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
            schedule_psychologistProfile: {
              include: {
                psychologist_user: {
                  select: {
                    user_photos: true,
                  },
                },
              },
            },
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
    type?: 'CHAT' | 'ONLINE' | 'OFFLINE',
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
    if (type) where.booking_type = type;

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

  async updateBookingStatus(
    psychologistUserId: string,
    bookingId: string,
    status: BookingStatus,
  ) {
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: { psychologist_userId: psychologistUserId },
      select: { psychologist_id: true },
    });
    if (!profile)
      throw new NotFoundException('Profil psikolog tidak ditemukan');

    const booking = await this.prisma.bookingPsychologist.findFirst({
      where: {
        booking_id: bookingId,
        booking_psychologistId: profile.psychologist_id,
      },
    });
    if (!booking) throw new NotFoundException('Booking tidak ditemukan');

    return this.prisma.bookingPsychologist.update({
      where: { booking_id: bookingId },
      data: { booking_status: status },
      select: { booking_id: true, booking_status: true },
    });
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
