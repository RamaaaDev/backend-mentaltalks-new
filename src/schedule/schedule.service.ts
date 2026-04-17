import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  QueryScheduleDto,
} from './dto/schedule.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  // ── Helper: pastikan psikolog ada ─────────────────────────────────────────
  private async getProfileOrThrow(userId: string) {
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: { psychologist_userId: userId },
      select: { psychologist_id: true },
    });
    if (!profile)
      throw new NotFoundException('Profil psikolog tidak ditemukan');
    return profile;
  }

  // ── PUBLIC: ambil jadwal tersedia (belum dibooking) ───────────────────────
  async findAvailable(query: QueryScheduleDto) {
    const { page = 1, limit = 10, psychologistId, type, from, to } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ScheduleWhereInput = {
      schedule_booking: null, // belum ada booking
      schedule_startTime: { gte: new Date() }, // hanya jadwal mendatang
    };

    if (psychologistId) where.schedule_psychologistId = psychologistId;
    if (type) where.schedule_type = type;
    if (from || to) {
      where.schedule_startTime = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { schedule_startTime: 'asc' },
        select: {
          schedule_id: true,
          schedule_startTime: true,
          schedule_endTime: true,
          schedule_price: true,
          schedule_type: true,
          schedule_locationId: true,
          schedule_psychologistProfile: {
            select: {
              psychologist_id: true,
              psychologist_name: true,
              psychologist_rating: true,
              psychologist_specialties: true,
            },
          },
          schedule_location: {
            select: {
              location_id: true,
              location_name: true,
              location_address: true,
            },
          },
        },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── PSYCHOLOGIST: buat jadwal baru ────────────────────────────────────────
  async create(userId: string, dto: CreateScheduleDto) {
    const profile = await this.getProfileOrThrow(userId);

    // Validasi: startTime harus sebelum endTime
    const start = new Date(dto.schedule_startTime);
    const end = new Date(dto.schedule_endTime);
    if (start >= end) {
      throw new BadRequestException(
        'Waktu mulai harus lebih awal dari waktu selesai',
      );
    }

    // Validasi: tidak boleh di masa lalu
    if (start < new Date()) {
      throw new BadRequestException('Jadwal tidak boleh di masa lalu');
    }

    // Validasi: untuk OFFLINE wajib ada locationId
    if (dto.schedule_type === 'OFFLINE' && !dto.schedule_locationId) {
      throw new BadRequestException(
        'Jadwal OFFLINE wajib menyertakan lokasi (schedule_locationId)',
      );
    }

    // Validasi: tidak boleh overlap dengan jadwal yang sudah ada
    const overlap = await this.prisma.schedule.findFirst({
      where: {
        schedule_psychologistId: profile.psychologist_id,
        OR: [
          {
            schedule_startTime: { lt: end },
            schedule_endTime: { gt: start },
          },
        ],
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'Jadwal bertabrakan dengan jadwal yang sudah ada',
      );
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        schedule_psychologistId: profile.psychologist_id,
        schedule_startTime: start,
        schedule_endTime: end,
        schedule_type: dto.schedule_type,
        schedule_price: dto.schedule_price,
        schedule_locationId: dto.schedule_locationId ?? null,
      },
    });

    return { message: 'Jadwal berhasil dibuat', data: schedule };
  }

  // ── PSYCHOLOGIST: update jadwal milik sendiri ─────────────────────────────
  async update(userId: string, scheduleId: string, dto: UpdateScheduleDto) {
    const profile = await this.getProfileOrThrow(userId);

    const schedule = await this.prisma.schedule.findUnique({
      where: { schedule_id: scheduleId },
      include: { schedule_booking: { select: { booking_id: true } } },
    });

    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');
    if (schedule.schedule_psychologistId !== profile.psychologist_id) {
      throw new ForbiddenException('Bukan jadwal milik Anda');
    }
    if (schedule.schedule_booking) {
      throw new BadRequestException(
        'Jadwal yang sudah dibooking tidak dapat diubah',
      );
    }

    const updated = await this.prisma.schedule.update({
      where: { schedule_id: scheduleId },
      data: {
        ...(dto.schedule_startTime && {
          schedule_startTime: new Date(dto.schedule_startTime),
        }),
        ...(dto.schedule_endTime && {
          schedule_endTime: new Date(dto.schedule_endTime),
        }),
        ...(dto.schedule_type && { schedule_type: dto.schedule_type }),
        ...(dto.schedule_price !== undefined && {
          schedule_price: dto.schedule_price,
        }),
        ...(dto.schedule_locationId !== undefined && {
          schedule_locationId: dto.schedule_locationId,
        }),
      },
    });

    return { message: 'Jadwal berhasil diperbarui', data: updated };
  }

  // ── PSYCHOLOGIST: hapus jadwal milik sendiri ──────────────────────────────
  async remove(userId: string, scheduleId: string) {
    const profile = await this.getProfileOrThrow(userId);

    const schedule = await this.prisma.schedule.findUnique({
      where: { schedule_id: scheduleId },
      include: { schedule_booking: { select: { booking_id: true } } },
    });

    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');
    if (schedule.schedule_psychologistId !== profile.psychologist_id) {
      throw new ForbiddenException('Bukan jadwal milik Anda');
    }
    if (schedule.schedule_booking) {
      throw new BadRequestException(
        'Jadwal yang sudah dibooking tidak dapat dihapus',
      );
    }

    await this.prisma.schedule.delete({ where: { schedule_id: scheduleId } });

    return { message: 'Jadwal berhasil dihapus' };
  }
}
