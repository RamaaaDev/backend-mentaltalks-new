import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAdminProfileDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createMyProfile(userId: string, dto: CreateAdminProfileDto) {
    // cek user ada
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // pastikan role ADMIN
    if (user.user_role !== 'ADMIN') {
      throw new ForbiddenException(
        'Akun anda tidak memiliki akses untuk melakukan ini!',
      );
    }

    // cek sudah punya profile atau belum
    const existing = await this.prisma.adminProfile.findUnique({
      where: { admin_userId: userId },
    });

    if (existing) {
      throw new ConflictException('Profil admin sudah ada');
    }

    // create profile
    const profile = await this.prisma.adminProfile.create({
      data: {
        admin_id: userId, // bisa pakai userId langsung
        admin_userId: userId,
        admin_specialty: dto.admin_specialty,
      },
    });

    return {
      message: 'Profil admin berhasil dibuat',
      data: profile,
    };
  }
}
