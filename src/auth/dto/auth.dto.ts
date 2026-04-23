import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username hanya boleh berisi huruf, angka, dan underscore',
  })
  user_username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @IsString()
  user_name: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  user_email: string;

  @IsOptional()
  @IsString()
  user_phone?: string;
}

export class LoginDto {
  @IsString()
  user_username: string;

  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  user_email: string;
}

export class ResetPasswordDto {
  @IsString()
  otp_code: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  user_email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  new_password: string;
}

export class RefreshTokenDto {
  @IsString()
  refresh_token: string;
}

export class VerifyOtpDto {
  @IsEmail()
  user_email: string;
  @IsString()
  otp_code: string;
}
