import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';
import { SAFE_USER_SELECT } from 'src/common/constants/user-select.constant';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * [USER] Ambil profil diri sendiri
   */
  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        ...SAFE_USER_SELECT,
        user_admin: {
          select: {
            admin_id: true,
          },
        },
        user_psychologist: {
          select: {
            psychologist_id: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Profil tidak ditemukan');
    }

    return { data: user };
  }

  async updateMyProfile(userId: string, dto: UpdateUserProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const updated = await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        user_username: dto.user_username,
        user_name: dto.user_name,
        user_email: dto.user_email,
        user_phone: dto.user_phone,
        user_birthday: dto.user_birthday
          ? new Date(dto.user_birthday)
          : undefined,
        user_photos: dto.user_photos,
      },
      select: SAFE_USER_SELECT,
    });
    console.log('DTO MASUK:', dto);

    return {
      message: 'Profil berhasil diperbarui',
      data: updated,
    };
  }

  async deleteMyAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    await this.prisma.user.update({
      where: { user_id: userId },
      data: { user_isActive: false },
    });

    return {
      message: 'Akun berhasil dihapus',
    };
  }
}
