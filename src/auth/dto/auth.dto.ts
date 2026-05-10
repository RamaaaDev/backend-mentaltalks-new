import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'Username minimal 3 karakter.' })
  @MaxLength(30, { message: 'Username maksimal 30 karakter.' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username hanya boleh berisi huruf, angka, dan underscore.',
  })
  // Normalize on the DTO level as a safety net (service also normalizes)
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  user_username: string;

  @IsString()
  @MinLength(8, { message: 'Kata sandi minimal 8 karakter.' })
  @MaxLength(50, { message: 'Kata sandi maksimal 50 karakter.' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Nama lengkap wajib diisi.' })
  user_name: string;

  @IsEmail({}, { message: 'Format email tidak valid.' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  user_email: string;

  @IsOptional()
  @IsString()
  user_phone?: string;
}

export class LoginDto {
  /**
   * Accepts either a username or an email address.
   * The service determines which one was provided by checking for "@".
   */
  @IsString({ message: 'Identifier wajib diisi.' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  identifier: string;

  @IsString({ message: 'Kata sandi wajib diisi.' })
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  user_email: string;
}

export class ResetPasswordDto {
  @IsString({ message: 'Kode OTP wajib diisi.' })
  otp_code: string;

  @IsEmail({}, { message: 'Format email tidak valid.' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  user_email: string;

  @IsString()
  @MinLength(8, { message: 'Kata sandi baru minimal 8 karakter.' })
  @MaxLength(50, { message: 'Kata sandi baru maksimal 50 karakter.' })
  new_password: string;
}

export class RefreshTokenDto {
  @IsString()
  refresh_token: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  user_email: string;

  @IsString({ message: 'Kode OTP wajib diisi.' })
  otp_code: string;

  @IsEnum(['REGISTER', 'FORGOT_PASSWORD'], {
    message: 'Tipe OTP tidak valid.',
  })
  otp_type: 'REGISTER' | 'FORGOT_PASSWORD';
}
