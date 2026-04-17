import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DETAIL_SELECT } from 'src/common/constants/psychologist-detail-select.constant';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  QueryPsychologistDto,
  UpdatePsychologistProfileDto,
} from 'src/psychologist/dto/psychologist.dto';

@Injectable()
export class AdminPsychologistService {
  constructor(private prisma: PrismaService) {}

  // Dashboard statistik global psikolog
  async adminDashboard() {
    const [
      totalPsychologists,
      activePsychologists,
      totalBookings,
      completedBookings,
      pendingBookings,
      topRated,
      specialtiesRaw,
    ] = await Promise.all([
      this.prisma.psychologistProfile.count(),
      this.prisma.psychologistProfile.count({
        where: { psychologist_user: { user_isActive: true } },
      }),
      this.prisma.bookingPsychologist.count(),
      this.prisma.bookingPsychologist.count({
        where: { booking_status: 'DONE' },
      }),
      this.prisma.bookingPsychologist.count({
        where: { booking_status: 'PENDING' },
      }),
      this.prisma.psychologistProfile.findMany({
        take: 5,
        orderBy: { psychologist_rating: 'desc' },
        select: {
          psychologist_id: true,
          psychologist_name: true,
          psychologist_rating: true,
          psychologist_ratingsCount: true,
          psychologist_specialties: true,
          _count: { select: { pscyhologist_bookings: true } },
        },
      }),
      this.prisma.psychologistProfile.findMany({
        select: { psychologist_specialties: true },
      }),
    ]);

    const allSpecialties = specialtiesRaw.flatMap(
      (p) => p.psychologist_specialties,
    );
    const specialtyCount = allSpecialties.reduce<Record<string, number>>(
      (acc, s) => {
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return {
      data: {
        psychologists: {
          total: totalPsychologists,
          active: activePsychologists,
          inactive: totalPsychologists - activePsychologists,
        },
        bookings: {
          total: totalBookings,
          completed: completedBookings,
          pending: pendingBookings,
          completionRate:
            totalBookings > 0
              ? ((completedBookings / totalBookings) * 100).toFixed(1) + '%'
              : '0%',
        },
        topRated,
        specialtyDistribution: specialtyCount,
      },
    };
  }

  // Semua psikolog tanpa filter aktif
  async adminFindAll(query: QueryPsychologistDto) {
    const { page = 1, limit = 10, search, specialty } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PsychologistProfileWhereInput = {};
    if (search) {
      where.OR = [
        { psychologist_name: { contains: search, mode: 'insensitive' } },
        {
          psychologist_user: {
            user_email: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }
    if (specialty) {
      where.psychologist_specialties = { has: specialty };
    }

    const [data, total] = await Promise.all([
      this.prisma.psychologistProfile.findMany({
        where,
        select: {
          ...DETAIL_SELECT,
          _count: {
            select: {
              pscyhologist_bookings: true,
              psychologist_reviews: true,
              pscyhologist_article: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { psychologist_createdAt: 'desc' },
      }),
      this.prisma.psychologistProfile.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Update profil psikolog manapun
  async adminUpdateProfile(
    psychologistId: string,
    dto: UpdatePsychologistProfileDto,
  ) {
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: { psychologist_id: psychologistId },
    });
    if (!profile) throw new NotFoundException('Psikolog tidak ditemukan');

    const updated = await this.prisma.psychologistProfile.update({
      where: { psychologist_id: psychologistId },
      data: dto,
      select: DETAIL_SELECT,
    });

    return { message: 'Profil psikolog diperbarui', data: updated };
  }

  /**
   * [ADMIN] Toggle aktif/nonaktif akun psikolog
   */
  async adminToggleActive(psychologistId: string) {
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: { psychologist_id: psychologistId },
      select: {
        psychologist_userId: true,
        psychologist_user: { select: { user_isActive: true } },
      },
    });
    if (!profile) throw new NotFoundException('Psikolog tidak ditemukan');

    const newStatus = !profile.psychologist_user.user_isActive;
    await this.prisma.user.update({
      where: { user_id: profile.psychologist_userId },
      data: { user_isActive: newStatus },
    });

    return {
      message: `Akun psikolog berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: { user_isActive: newStatus },
    };
  }
}
