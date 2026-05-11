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
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const username = dto.user_username.toLowerCase();
    const email = dto.user_email.toLowerCase();

    // ── Username uniqueness check ────────────────────────────────────────────
    const existingByUsername = await this.prisma.user.findUnique({
      where: { user_username: username },
    });

    if (existingByUsername) {
      if (existingByUsername.isVerified || existingByUsername.user_isActive) {
        throw new ConflictException(
          'Username sudah digunakan. Silakan pilih username lain.',
        );
      }

      // Username exists but account is not yet verified — resend OTP so the
      // user can complete their previous registration attempt
      if (existingByUsername.user_email) {
        await this.sendOtpToUser(
          existingByUsername.user_id,
          existingByUsername.user_email,
          'REGISTER',
        );
      }

      return {
        message:
          'Akun dengan username ini belum diverifikasi. Kode OTP baru telah dikirim ke email Anda.',
      };
    }

    // ── Email uniqueness check ───────────────────────────────────────────────
    const existingByEmail = await this.prisma.user.findFirst({
      where: { user_email: email },
    });

    if (existingByEmail) {
      throw new ConflictException(
        'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
      );
    }

    // ── Create user ──────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        user_username: username,
        user_name: dto.user_name,
        user_email: email,
        user_phone: dto.user_phone ?? null,
        user_passwordHash: passwordHash,
        // Account is inactive until email is verified
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

    await this.sendOtpToUser(user.user_id, email, 'REGISTER');

    return {
      message:
        'Pendaftaran berhasil. Silakan cek email Anda dan masukkan kode OTP untuk mengaktifkan akun.',
      data: {
        user_username: user.user_username,
        user_email: user.user_email,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    // Normalize the identifier so login is case-insensitive for both
    // username ("JohnDoe" == "johndoe") and email ("User@Mail.com" == "user@mail.com")
    const identifier = dto.identifier.toLowerCase().trim();
    const isEmail = identifier.includes('@');

    const user = await this.prisma.user.findFirst({
      where: isEmail
        ? { user_email: identifier }
        : { user_username: identifier },
    });

    // Use a generic error message to prevent user enumeration attacks
    const invalidCredentialsError = new UnauthorizedException(
      'Username/email atau kata sandi tidak sesuai.',
    );

    if (!user || !user.user_passwordHash) {
      throw invalidCredentialsError;
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.user_passwordHash,
    );

    if (!isPasswordValid) {
      throw invalidCredentialsError;
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Akun belum diverifikasi. Silakan cek email Anda dan selesaikan verifikasi OTP.',
      );
    }

    if (!user.user_isActive) {
      throw new UnauthorizedException(
        'Akun Anda telah dinonaktifkan. Silakan hubungi tim dukungan kami.',
      );
    }

    const tokens = await this.generateTokens(
      user.user_id,
      user.user_username,
      user.user_role,
    );

    // Store a hashed version of the refresh token so the raw token is never
    // persisted in the database (defense-in-depth against DB leaks)
    const refreshTokenHash = await bcrypt.hash(tokens.refresh_token, 10);
    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: { user_refreshToken: refreshTokenHash },
    });

    return {
      message: 'Selamat datang kembali!',
      data: {
        user_id: user.user_id,
        user_username: user.user_username,
        user_name: user.user_name,
        user_role: user.user_role,
        ...tokens,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────────────────────

  async logout(userId: string) {
    // Invalidate the refresh token by clearing it from the database,
    // forcing the user to log in again to obtain a new token pair
    await this.prisma.user.update({
      where: { user_id: userId },
      data: { user_refreshToken: null },
    });

    return { message: 'Anda telah berhasil keluar.' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────────────────────────────────────

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user || !user.user_refreshToken) {
      throw new UnauthorizedException(
        'Sesi tidak valid. Silakan masuk kembali.',
      );
    }

    // Compare the incoming raw token against the stored hash
    const isMatch = await bcrypt.compare(refreshToken, user.user_refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException(
        'Sesi tidak valid. Silakan masuk kembali.',
      );
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

    return {
      message: 'Sesi berhasil diperbarui.',
      data: tokens,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.user_email.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: { user_email: email, user_isActive: true },
    });

    // Always return the same message regardless of whether the email exists.
    // This prevents attackers from discovering registered email addresses
    // (known as a user enumeration attack).
    if (user) {
      await this.sendOtpToUser(user.user_id, email, 'FORGOT_PASSWORD');
    }

    return {
      message:
        'Jika email tersebut terdaftar, kode OTP akan segera dikirimkan. Silakan cek inbox atau folder spam Anda.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VERIFY OTP
  // ─────────────────────────────────────────────────────────────────────────────

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.user_email.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: { user_email: email },
    });

    if (!user) {
      throw new NotFoundException(
        'Akun dengan email tersebut tidak ditemukan.',
      );
    }

    const otp = await this.prisma.otp.findUnique({
      where: { otp_userId: user.user_id },
    });

    if (!otp || otp.otp_type !== dto.otp_type) {
      throw new BadRequestException(
        'Kode OTP tidak valid. Silakan ulangi prosesnya untuk mendapatkan kode baru.',
      );
    }

    if (otp.otp_expiredAt < new Date()) {
      throw new BadRequestException(
        'Kode OTP sudah kedaluwarsa. Silakan minta kode baru.',
      );
    }

    if (otp.otp_code !== dto.otp_code) {
      throw new BadRequestException(
        'Kode OTP salah. Periksa kembali kode yang dikirim ke email Anda.',
      );
    }

    // Khusus REGISTER: aktifkan akun dan hapus OTP
    if (dto.otp_type === 'REGISTER') {
      if (user.isVerified) {
        return { message: 'Akun Anda sudah aktif. Silakan langsung masuk.' };
      }

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { user_id: user.user_id },
          data: { isVerified: true, user_isActive: true },
        }),
        this.prisma.otp.delete({
          where: { otp_userId: user.user_id },
        }),
      ]);

      return {
        message:
          'Akun Anda telah berhasil diaktifkan. Selamat datang di MentalTalks! Silakan masuk untuk melanjutkan.',
      };
    }

    // Khusus FORGOT_PASSWORD: OTP valid, tapi JANGAN hapus dulu —
    // OTP masih dibutuhkan oleh /reset-password untuk verifikasi ulang
    return {
      message:
        'Kode OTP valid. Silakan lanjutkan untuk mengatur kata sandi baru.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.user_email.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: { user_email: email, user_isActive: true },
    });

    if (!user) {
      throw new NotFoundException(
        'Akun dengan email tersebut tidak ditemukan.',
      );
    }

    const otp = await this.prisma.otp.findUnique({
      where: { otp_userId: user.user_id },
    });

    if (!otp || otp.otp_type !== 'FORGOT_PASSWORD') {
      throw new BadRequestException(
        'Kode OTP tidak valid. Silakan ulangi proses lupa kata sandi.',
      );
    }

    if (otp.otp_expiredAt < new Date()) {
      throw new BadRequestException(
        'Kode OTP sudah kedaluwarsa. Silakan minta kode baru.',
      );
    }

    if (otp.otp_code !== dto.otp_code) {
      throw new BadRequestException(
        'Kode OTP salah. Periksa kembali kode yang dikirim ke email Anda.',
      );
    }

    const newHash = await bcrypt.hash(dto.new_password, 12);

    // Reset password and invalidate all existing sessions in a single transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { user_id: user.user_id },
        data: {
          user_passwordHash: newHash,
          // Clearing the refresh token forces all active sessions to expire,
          // ensuring old sessions cannot be used after a password change
          user_refreshToken: null,
        },
      }),
      this.prisma.otp.delete({
        where: { otp_userId: user.user_id },
      }),
    ]);

    return {
      message:
        'Kata sandi berhasil diubah. Silakan masuk menggunakan kata sandi baru Anda.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generates a short-lived access token and a longer-lived refresh token.
   * Token lifetimes are configured via environment variables.
   */
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

  /**
   * Generates a 6-digit OTP, stores it (upsert) in the database, and sends it
   * to the user's email. OTPs expire after 10 minutes.
   */
  private async sendOtpToUser(
    userId: string,
    email: string,
    type: 'REGISTER' | 'FORGOT_PASSWORD',
  ) {
    const otpCode = Math.floor(100_000 + Math.random() * 900_000).toString();
    const expiredAt = new Date(Date.now() + 10 * 60 * 1_000); // 10 minutes

    // Upsert so that requesting a new OTP always invalidates the previous one
    await this.prisma.otp.upsert({
      where: { otp_userId: userId },
      update: { otp_code: otpCode, otp_expiredAt: expiredAt, otp_type: type },
      create: {
        otp_userId: userId,
        otp_code: otpCode,
        otp_expiredAt: expiredAt,
        otp_type: type,
      },
    });

    await this.mailService.sendOtp(email, otpCode, type);
  }
}
