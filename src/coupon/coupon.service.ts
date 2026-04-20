import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  QueryCouponDto,
  ApplyCouponDto,
} from './dto/coupon.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  // ── Helper: ambil coupon aktif & valid atau lempar error ──────────────────
  private async getActiveCouponOrThrow(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { coupon_code: code },
    });

    if (!coupon) {
      throw new NotFoundException('Kupon tidak ditemukan');
    }
    if (!coupon.coupon_isActive) {
      throw new BadRequestException('Kupon tidak aktif');
    }
    if (coupon.coupon_expiresAt < new Date()) {
      throw new BadRequestException('Kupon sudah kedaluwarsa');
    }
    if (
      coupon.coupon_usageLimit !== null &&
      coupon.coupon_usedCount >= coupon.coupon_usageLimit
    ) {
      throw new BadRequestException('Kupon sudah mencapai batas penggunaan');
    }

    return coupon;
  }

  // ── ADMIN: buat kupon baru ────────────────────────────────────────────────
  async create(dto: CreateCouponDto) {
    const existingCode = await this.prisma.coupon.findUnique({
      where: { coupon_code: dto.coupon_code.toUpperCase() },
      select: { coupon_id: true },
    });
    if (existingCode) {
      throw new ConflictException('Kode kupon sudah digunakan');
    }

    if (dto.coupon_type === 'PERCENTAGE' && dto.coupon_value > 100) {
      throw new BadRequestException(
        'Nilai diskon persentase tidak boleh melebihi 100',
      );
    }

    const expiresAt = new Date(dto.coupon_expiresAt);
    if (expiresAt <= new Date()) {
      throw new BadRequestException(
        'Tanggal kedaluwarsa harus di masa mendatang',
      );
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        coupon_code: dto.coupon_code.toUpperCase(),
        coupon_type: dto.coupon_type,
        coupon_value: dto.coupon_value,
        coupon_maxDiscount: dto.coupon_maxDiscount ?? null,
        coupon_minPurchase: dto.coupon_minPurchase ?? null,
        coupon_usageLimit: dto.coupon_usageLimit ?? null,
        coupon_expiresAt: expiresAt,
        coupon_isActive: dto.coupon_isActive ?? true,
      },
    });

    return { message: 'Kupon berhasil dibuat', data: coupon };
  }

  // ── ADMIN & PSYCHOLOGIST & USER: ambil semua kupon ───────────────────────
  async findAll(query: QueryCouponDto) {
    const { page = 1, limit = 10, isActive, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = {};

    if (isActive !== undefined) where.coupon_isActive = isActive;
    if (type) where.coupon_type = type;

    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { coupon_createdAt: 'desc' },
        select: {
          coupon_id: true,
          coupon_code: true,
          coupon_type: true,
          coupon_value: true,
          coupon_maxDiscount: true,
          coupon_minPurchase: true,
          coupon_usageLimit: true,
          coupon_usedCount: true,
          coupon_expiresAt: true,
          coupon_isActive: true,
          coupon_createdAt: true,
        },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── ADMIN & PSYCHOLOGIST & USER: ambil satu kupon berdasarkan ID ──────────
  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { coupon_id: id },
    });

    if (!coupon) {
      throw new NotFoundException('Kupon tidak ditemukan');
    }

    return coupon;
  }

  // ── ADMIN: update kupon ───────────────────────────────────────────────────
  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { coupon_id: id },
      select: { coupon_id: true, coupon_type: true, coupon_value: true },
    });

    if (!coupon) {
      throw new NotFoundException('Kupon tidak ditemukan');
    }

    const resolvedType = dto.coupon_type ?? coupon.coupon_type;
    const resolvedValue = dto.coupon_value ?? coupon.coupon_value;

    if (resolvedType === 'PERCENTAGE' && resolvedValue > 100) {
      throw new BadRequestException(
        'Nilai diskon persentase tidak boleh melebihi 100',
      );
    }

    if (dto.coupon_expiresAt) {
      const expiresAt = new Date(dto.coupon_expiresAt);
      if (expiresAt <= new Date()) {
        throw new BadRequestException(
          'Tanggal kedaluwarsa harus di masa mendatang',
        );
      }
    }

    const updated = await this.prisma.coupon.update({
      where: { coupon_id: id },
      data: {
        ...(dto.coupon_type && { coupon_type: dto.coupon_type }),
        ...(dto.coupon_value !== undefined && {
          coupon_value: dto.coupon_value,
        }),
        ...(dto.coupon_maxDiscount !== undefined && {
          coupon_maxDiscount: dto.coupon_maxDiscount,
        }),
        ...(dto.coupon_minPurchase !== undefined && {
          coupon_minPurchase: dto.coupon_minPurchase,
        }),
        ...(dto.coupon_usageLimit !== undefined && {
          coupon_usageLimit: dto.coupon_usageLimit,
        }),
        ...(dto.coupon_expiresAt && {
          coupon_expiresAt: new Date(dto.coupon_expiresAt),
        }),
        ...(dto.coupon_isActive !== undefined && {
          coupon_isActive: dto.coupon_isActive,
        }),
      },
    });

    return { message: 'Kupon berhasil diperbarui', data: updated };
  }

  // ── ADMIN: hapus kupon ────────────────────────────────────────────────────
  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { coupon_id: id },
      select: { coupon_id: true, _count: { select: { coupon_booking: true } } },
    });

    if (!coupon) {
      throw new NotFoundException('Kupon tidak ditemukan');
    }
    if (coupon._count.coupon_booking > 0) {
      throw new BadRequestException(
        'Kupon yang sudah digunakan dalam booking tidak dapat dihapus',
      );
    }

    await this.prisma.coupon.delete({ where: { coupon_id: id } });

    return { message: 'Kupon berhasil dihapus' };
  }

  // ── USER: validasi & hitung diskon kupon ──────────────────────────────────
  async apply(userId: string, dto: ApplyCouponDto) {
    const coupon = await this.getActiveCouponOrThrow(dto.coupon_code);

    if (
      coupon.coupon_minPurchase !== null &&
      dto.purchase_amount < coupon.coupon_minPurchase
    ) {
      throw new BadRequestException(
        `Minimum pembelian untuk kupon ini adalah Rp ${coupon.coupon_minPurchase.toLocaleString('id-ID')}`,
      );
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
    if (alreadyUsed) {
      throw new BadRequestException('Anda sudah pernah menggunakan kupon ini');
    }

    // Hitung diskon
    let discountAmount = 0;
    if (coupon.coupon_type === 'PERCENTAGE') {
      discountAmount = Math.floor(
        (dto.purchase_amount * coupon.coupon_value) / 100,
      );
      if (
        coupon.coupon_maxDiscount !== null &&
        discountAmount > coupon.coupon_maxDiscount
      ) {
        discountAmount = coupon.coupon_maxDiscount;
      }
    } else {
      discountAmount = coupon.coupon_value;
    }

    // Diskon tidak boleh melebihi harga asli
    discountAmount = Math.min(discountAmount, dto.purchase_amount);
    const finalAmount = dto.purchase_amount - discountAmount;

    return {
      data: {
        coupon_id: coupon.coupon_id,
        coupon_code: coupon.coupon_code,
        coupon_type: coupon.coupon_type,
        original_amount: dto.purchase_amount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
      },
    };
  }

  // ── USER: tandai kupon telah digunakan (dipanggil setelah booking) ─────────
  async markAsUsed(userId: string, couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { coupon_id: couponId },
      select: { coupon_id: true, coupon_usedCount: true },
    });

    if (!coupon) {
      throw new NotFoundException('Kupon tidak ditemukan');
    }

    await this.prisma.$transaction([
      this.prisma.couponUsage.create({
        data: {
          couponUsage_couponId: couponId,
          couponUsage_userId: userId,
        },
      }),
      this.prisma.coupon.update({
        where: { coupon_id: couponId },
        data: { coupon_usedCount: { increment: 1 } },
      }),
    ]);

    return { message: 'Kupon berhasil ditandai sebagai terpakai' };
  }
}
