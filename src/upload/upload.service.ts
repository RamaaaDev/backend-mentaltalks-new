import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateAvatarResponse } from './upload.interface';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async updateAvatar(
    userId: string,
    photoUrl: string,
  ): Promise<UpdateAvatarResponse> {
    const user = await this.prisma.user.update({
      where: { user_id: userId },
      data: { user_photos: photoUrl },
      select: { user_photos: true },
    });

    return {
      message: 'Foto profil berhasil diupdate',
      avatarUrl: user.user_photos ?? '',
    };
  }
}
