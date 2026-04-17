import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { SAFE_USER_SELECT } from 'src/common/constants/user-select.constant';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminUserService {
  constructor(private prisma: PrismaService) {}

  //   Get all user with pagination
  async findAllUsers(params: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 10, role, isActive, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (role) where.user_role = role as Role;
    if (isActive !== undefined) where.user_isActive = isActive;
    if (search) {
      where.OR = [
        { user_username: { contains: search, mode: 'insensitive' } },
        { user_name: { contains: search, mode: 'insensitive' } },
        { user_email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        skip,
        take: limit,
        orderBy: { user_createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  //get detail user by Id
  async findUserById(targetId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: targetId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return { data: user };
  }

  //Update profile (can update all role)
  async updateProfile(
    requesterId: string,
    requesterRole: string,
    targetId: string,
    updateData: {
      user_name?: string;
      user_phone?: string;
      user_birthday?: Date;
      user_photos?: string;
    },
  ) {
    if (requesterRole !== 'ADMIN' && requesterId !== targetId) {
      throw new ForbiddenException(
        'Hanya admin yang dapat melakukan perintah ini!',
      );
    }

    if (requesterRole == 'ADMIN' && requesterId !== targetId) {
      throw new ForbiddenException(
        'Akun admin tidak dapat melakukan perubahan terhadap akun admin lainnya',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { user_id: targetId },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const updated = await this.prisma.user.update({
      where: { user_id: targetId },
      data: updateData,
      select: SAFE_USER_SELECT,
    });

    return { message: 'Profil berhasil diperbarui', data: updated };
  }
}
