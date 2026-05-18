import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { StorageEngine, Options } from 'multer';
import { extname } from 'path';

import { UploadService } from './upload.service';
import type { UpdateAvatarResponse } from './upload.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';

const storage: StorageEngine = diskStorage({
  destination: '/var/www/backend/uploads/avatars',
  filename: (
    _req: AuthenticatedRequest,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${unique}${extname(file.originalname)}`);
  },
});

const multerOptions: Options = {
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (
    _req: AuthenticatedRequest,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    const allowed = /\.(jpg|jpeg|png|webp)$/i;
    if (!allowed.test(file.originalname)) {
      return cb(new BadRequestException('Hanya JPG, PNG, atau WEBP'), false);
    }
    cb(null, true);
  },
};

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<UpdateAvatarResponse> {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }

    const photoUrl = `/uploads/avatars/${file.filename}`;

    return this.uploadService.updateAvatar(req.user.user_id, photoUrl);
  }
}
