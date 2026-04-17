import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  // ─── ────────────────────── REGISTER ──────────────────────────────────────────

  async register(dto: RegisterDto) {
    // Check existing username
    const existingUser = await this.prisma.user.findUnique({
      where: { user_username: dto.user_username },
    });
    if (existingUser) {
      if (existingUser.isVerified || existingUser.user_isActive) {
        throw new ConflictException('Username sudah digunakan');
      }

      // Kalau belum verified → kirim ulang OTP
      if (dto.user_email && existingUser.user_email) {
        await this.sendOtpToUser(
          existingUser.user_id,
          existingUser.user_email,
          'REGISTER',
        );
      }
    }

    // Cek email sudah dipakai (jika diberikan)
    if (dto.user_email) {
      const emailUsed = await this.prisma.user.findFirst({
        where: { user_email: dto.user_email },
      });
      if (emailUsed) {
        throw new ConflictException('Email sudah digunakan');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        user_username: dto.user_username,
        user_name: dto.user_name,
        user_email: dto.user_email,
        user_phone: dto.user_phone,
        user_passwordHash: passwordHash,
        user_isActive: false,
        isVerified: false,
      },
      select: {
        user_id: true,
        user_username: true,
        user_name: true,
        user_email: true,
        user_role: true,
        user_createdAt: true,
        isVerified: true,
      },
    });

    // Kirim OTP verifikasi email jika email ada
    if (dto.user_email) {
      await this.sendOtpToUser(user.user_id, dto.user_email, 'REGISTER');
    }

    return {
      message: 'Registrasi berhasil. Silakan verifikasi email Anda.',
      data: user,
    };
  }

  // ────────────────────── LOGIN ─────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { user_username: dto.user_username },
    });

    if (!user || !user.user_passwordHash) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.user_passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Username atau password salah');
    }

    if (!user.user_isActive) {
      throw new UnauthorizedException(
        'Akun belum aktif. Silahkan melakukan registrasi ulang.',
      );
    }

    const tokens = await this.generateTokens(
      user.user_id,
      user.user_username,
      user.user_role,
    );

    // Simpan refresh token (hash) ke DB
    const refreshTokenHash = await bcrypt.hash(tokens.refresh_token, 10);
    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: { user_refreshToken: refreshTokenHash },
    });

    return {
      message: 'Login berhasil',
      data: {
        user_id: user.user_id,
        user_username: user.user_username,
        user_name: user.user_name,
        user_role: user.user_role,
        ...tokens,
      },
    };
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────────

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { user_id: userId },
      data: { user_refreshToken: null },
    });
    return { message: 'Logout berhasil' };
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────────────────────

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user || !user.user_refreshToken) {
      throw new UnauthorizedException('Akses ditolak');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.user_refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    const tokens = await this.generateTokens(
      user.user_id,
      user.user_username,
      user.user_role,
    );

    const newRefreshHash = await bcrypt.hash(tokens.refresh_token, 10);
    await this.prisma.user.update({
      where: { user_id: userId },
      data: { user_refreshToken: newRefreshHash },
    });

    return { message: 'Token diperbarui', data: tokens };
  }

  // ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { user_email: dto.user_email, user_isActive: true },
    });

    // Jangan bocorkan apakah email terdaftar atau tidak
    if (!user) {
      return {
        message:
          'Kode OTP akan dikirimkan melalui email, jika email tersebut telah terdaftar.',
      };
    }

    await this.sendOtpToUser(user.user_id, dto.user_email, 'FORGOT_PASSWORD');

    return {
      message:
        'Kode OTP akan dikirimkan melalui email, jika email tersebut telah terdaftar.',
    };
  }

  // ─── RESET PASSWORD ───────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { user_email: dto.user_email, user_isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Verifikasi OTP
    const otp = await this.prisma.otp.findUnique({
      where: { otp_userId: user.user_id },
    });

    if (!otp || otp.otp_code !== dto.otp_code) {
      throw new BadRequestException('Kode OTP tidak valid');
    }

    if (otp.otp_expiredAt < new Date()) {
      throw new BadRequestException('Kode OTP sudah kedaluwarsa');
    }

    // Update password
    const newHash = await bcrypt.hash(dto.new_password, 12);
    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        user_passwordHash: newHash,
        user_refreshToken: null, // invalidate semua sesi
      },
    });

    // Hapus OTP setelah dipakai
    await this.prisma.otp.delete({ where: { otp_userId: user.user_id } });

    return { message: 'Password berhasil diubah. Silakan login kembali.' };
  }

  // ─────────────────────── HELPERS ──────────────────────────────────────────────

  private async generateTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };

    const [access_token, refresh_token]: [string, string] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ??
          '24h') as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
          '7d') as StringValue,
      }),
    ]);

    return { access_token, refresh_token };
  }

  private async sendOtpToUser(
    userId: string,
    email: string,
    type: 'REGISTER' | 'FORGOT_PASSWORD',
  ) {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiredAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // Upsert OTP (buat baru atau update yang lama)
    await this.prisma.otp.upsert({
      where: { otp_userId: userId },
      update: {
        otp_code: otpCode,
        otp_expiredAt: expiredAt,
        otp_type: type,
      },
      create: {
        otp_userId: userId,
        otp_code: otpCode,
        otp_expiredAt: expiredAt,
        otp_type: type,
      },
    });

    // Kirim email
    await this.mailService.sendOtp(email, otpCode, type);
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: { user_email: dto.user_email },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (user.isVerified) {
      return { message: 'Akun sudah terverifikasi, silakan login.' };
    }

    const otp = await this.prisma.otp.findUnique({
      where: { otp_userId: user.user_id },
    });

    if (!otp || otp.otp_code !== dto.otp_code) {
      throw new BadRequestException('Kode OTP tidak valid');
    }

    if (otp.otp_expiredAt < new Date()) {
      throw new BadRequestException('Kode OTP sudah kedaluwarsa');
    }

    if (otp.otp_type !== 'REGISTER') {
      throw new BadRequestException('OTP tidak valid untuk verifikasi akun');
    }

    // Aktifkan akun
    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        isVerified: true,
        user_isActive: true,
      },
    });

    // Hapus OTP setelah dipakai
    await this.prisma.otp.delete({ where: { otp_userId: user.user_id } });

    return { message: 'Akun telah berhasil didaftarkan. Silahkan login.' };
  }
}
