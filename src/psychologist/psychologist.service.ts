import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePsychologistProfileDto,
  UpdatePsychologistProfileDto,
  QueryPsychologistDto,
  YearlyDataDto,
} from './dto/psychologist.dto';
import { Prisma } from '@prisma/client';
import { PSYCHOLOGIST_PUBLIC_SELECT } from 'src/common/constants/psychologist-select.constant';
import { DETAIL_SELECT } from 'src/common/constants/psychologist-detail-select.constant';

@Injectable()
export class PsychologistService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC — Guest & semua user bisa akses
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Daftar semua psikolog (aktif) — dengan filter & pagination
   */
  async findAll(query: QueryPsychologistDto) {
    const {
      page = 1,
      limit = 10,
      search,
      specialty,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PsychologistProfileWhereInput = {
      psychologist_user: { user_isActive: true },
    };

    if (search) {
      where.OR = [
        { psychologist_name: { contains: search, mode: 'insensitive' } },
        { psychologist_bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (specialty) {
      where.psychologist_specialties = { has: specialty };
    }

    const orderByMap: Record<string, string> = {
      rating: 'psychologist_rating',
      yearsExperience: 'psychologist_yearsExperience',
      createdAt: 'psychologist_createdAt',
    };

    const [data, total] = await Promise.all([
      this.prisma.psychologistProfile.findMany({
        where,
        select: PSYCHOLOGIST_PUBLIC_SELECT,
        skip,
        take: limit,
        orderBy: { [orderByMap[sortBy]]: order },
      }),
      this.prisma.psychologistProfile.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Detail profil psikolog by ID — publik
   */
  async findOne(psychologistId: string) {
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: { psychologist_id: psychologistId },
      select: {
        ...DETAIL_SELECT,
        psychologist_reviews: {
          take: 5,
          orderBy: { reviewPsikolog_createdAt: 'desc' },
          select: {
            reviewPsikolog_id: true,
            reviewPsikolog_rating: true,
            reviewPsikolog_comment: true,
            reviewPsikolog_createdAt: true,
            reviewPsikolog_user: {
              select: { user_name: true, user_photos: true },
            },
          },
        },
        pscyhologist_schedule: {
          where: { schedule_booking: null },
          select: {
            schedule_id: true,
            schedule_startTime: true,
            schedule_endTime: true,
            schedule_price: true,
            schedule_type: true,
            schedule_locationId: true,
          },
          orderBy: { schedule_startTime: 'asc' },
        },
      },
    });

    if (!profile) throw new NotFoundException('Psikolog tidak ditemukan');

    return { data: profile };
  }

  /**
   * Daftar semua spesialisasi yang tersedia — untuk filter UI
   */
  async getAllSpecialties() {
    const profiles = await this.prisma.psychologistProfile.findMany({
      select: { psychologist_specialties: true },
      where: { psychologist_user: { user_isActive: true } },
    });

    const specialties = [
      ...new Set(profiles.flatMap((p) => p.psychologist_specialties)),
    ].sort();

    return { data: specialties };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PSYCHOLOGIST — hanya psikolog pemilik profil
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Buat profil psikolog (satu user hanya boleh punya satu profil)
   */
  async createProfile(userId: string, dto: CreatePsychologistProfileDto) {
    const existing = await this.prisma.psychologistProfile.findUnique({
      where: { psychologist_userId: userId },
    });
    if (existing) throw new ConflictException('Profil psikolog sudah ada');

    const profile = await this.prisma.psychologistProfile.create({
      data: {
        psychologist_userId: userId,
        ...dto,
      },
      select: DETAIL_SELECT,
    });

    return { message: 'Profil psikolog berhasil dibuat', data: profile };
  }

  /**
   * Update profil psikolog milik sendiri
   */
  async updateMyProfile(userId: string, dto: UpdatePsychologistProfileDto) {
    const profile = await this.findProfileByUserId(userId);

    const updated = await this.prisma.psychologistProfile.update({
      where: { psychologist_id: profile.psychologist_id },
      data: dto,
      select: DETAIL_SELECT,
    });

    return { message: 'Profil berhasil diperbarui', data: updated };
  }

  /**
   * Profil psikolog milik sendiri (lebih detail dari publik)
   */
  async getMyProfile(userId: string) {
    const profile = await this.findProfileByUserId(userId);
    return { data: profile };
  }

  /**
   * Dashboard statistik psikolog
   */
  async getMyDashboard(userId: string) {
    const profile = await this.findProfileByUserId(userId);
    const psyId = profile.psychologist_id;

    const now = new Date();
    const currentYear = now.getFullYear();

    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const quarters = [
      { label: 'Q1', months: [0, 1, 2] },
      { label: 'Q2', months: [3, 4, 5] },
      { label: 'Q3', months: [6, 7, 8] },
      { label: 'Q4', months: [9, 10, 11] },
    ];

    const yearlyData = await this.prisma.$queryRaw<YearlyDataDto[]>`
  SELECT 
    EXTRACT(QUARTER FROM "booking_createdAt") as quarter,
    COUNT(*) as "totalBookings",
    COUNT(DISTINCT "booking_userId") as "uniqueUsers"
  FROM booking_psychologist
  WHERE "booking_psychologistId" = ${psyId}
    AND EXTRACT(YEAR FROM "booking_createdAt") = ${currentYear}
  GROUP BY quarter
`;

    // mapping ke format FE
    const chartData = quarters.map((q, i) => {
      const found = yearlyData.find((d) => Number(d.quarter) === i + 1);

      return {
        quarter: q.label,
        totalBookings: found ? Number(found.totalBookings) : 0,
        uniqueUser: found ? Number(found.uniqueUsers) : 0,
      };
    });

    // 🔥 dashboard summary (tetap pakai Promise.all)
    const [
      totalBookings,
      bookingsThisMonth,
      pendingBookings,
      completedBookings,
      upcomingMeetings,
      totalReviews,
      recentReviews,
    ] = await Promise.all([
      this.prisma.bookingPsychologist.count({
        where: { booking_psychologistId: psyId },
      }),
      this.prisma.bookingPsychologist.count({
        where: {
          booking_psychologistId: psyId,
          booking_createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.bookingPsychologist.count({
        where: {
          booking_psychologistId: psyId,
          booking_status: 'PENDING',
        },
      }),
      this.prisma.bookingPsychologist.count({
        where: {
          booking_psychologistId: psyId,
          booking_status: 'DONE',
        },
      }),
      this.prisma.meetingRoom.findMany({
        where: {
          meeting_hostId: psyId,
          meeting_scheduleAt: { gte: now },
          meeting_status: { not: 'ENDED' },
        },
        take: 5,
        orderBy: { meeting_scheduleAt: 'asc' },
        select: {
          meeting_id: true,
          meeting_scheduleAt: true,
          meeting_status: true,
          participant: {
            select: { user_name: true, user_photos: true },
          },
        },
      }),
      this.prisma.reviewsPsikolog.count({
        where: { reviewPsikolog_psychologistId: psyId },
      }),
      this.prisma.reviewsPsikolog.findMany({
        where: { reviewPsikolog_psychologistId: psyId },
        take: 3,
        orderBy: { reviewPsikolog_createdAt: 'desc' },
        select: {
          reviewPsikolog_id: true,
          reviewPsikolog_rating: true,
          reviewPsikolog_comment: true,
          reviewPsikolog_createdAt: true,
          reviewPsikolog_user: {
            select: { user_name: true, user_photos: true },
          },
        },
      }),
    ]);

    return {
      data: {
        profile: {
          psychologist_name: profile.psychologist_name,
          psychologist_rating: profile.psychologist_rating,
          psychologist_ratingsCount: profile.psychologist_ratingsCount,
        },
        bookings: {
          total: totalBookings,
          thisMonth: bookingsThisMonth,
          pending: pendingBookings,
          completed: completedBookings,
        },
        meetings: {
          upcoming: upcomingMeetings,
        },
        reviews: {
          total: totalReviews,
          recent: recentReviews,
          averageRating: profile.psychologist_rating,
        },
        chart: chartData, // ✅ langsung siap FE
      },
    };
  }

  /**
   * Daftar pasien psikolog (user yang pernah booking)
   */
  async getMyPatients(userId: string, page = 1, limit = 10) {
    const profile = await this.findProfileByUserId(userId);
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.bookingPsychologist.findMany({
        where: { booking_psychologistId: profile.psychologist_id },
        select: {
          booking_id: true,
          booking_status: true,
          booking_createdAt: true,
          booking_schedule: {
            select: {
              schedule_startTime: true,
              schedule_endTime: true,
            },
          },
          booking_user: {
            select: {
              user_id: true,
              user_name: true,
              user_email: true,
              user_photos: true,
              user_phone: true,
            },
          },
        },
        orderBy: {
          booking_schedule: {
            schedule_startTime: 'desc',
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.bookingPsychologist.count({
        where: { booking_psychologistId: profile.psychologist_id },
      }),
    ]);

    // Deduplicate pasien unik
    const uniquePatients = [
      ...new Map(
        bookings.map((b) => [b.booking_user.user_id, b.booking_user]),
      ).values(),
    ];

    return {
      data: {
        patients: uniquePatients,
        bookings,
      },
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Jadwal milik psikolog sendiri
   */
  async getMySchedules(userId: string) {
    const profile = await this.findProfileByUserId(userId);

    const schedules = await this.prisma.schedule.findMany({
      where: { schedule_psychologistId: profile.psychologist_id },
      orderBy: { schedule_startTime: 'asc' },
    });

    return { data: schedules };
  }

  // ─── PRIVATE HELPER ────────────────────────────────────────────────────────

  private async findProfileByUserId(userId: string) {
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: { psychologist_userId: userId },
      select: {
        ...DETAIL_SELECT,
        psychologist_rating: true,
        psychologist_ratingsCount: true,
      },
    });
    if (!profile)
      throw new NotFoundException('Profil psikolog tidak ditemukan');
    return profile;
  }
}
