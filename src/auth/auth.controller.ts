import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Create new account
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * Login dan dapatkan access token + refresh token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // 🔥 SET COOKIE DI SINI
    res.cookie('access_token', result.data.access_token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
    });

    res.cookie('refresh_token', result.data.refresh_token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
    });
    return {
      message: result.message,
      data: {
        user_id: result.data.user_id,
        user_username: result.data.user_username,
        user_name: result.data.user_name,
        user_role: result.data.user_role,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return {
      data: {
        user_id: req.user.user_id,
        user_username: req.user.user_username,
        user_role: req.user.user_role,
      },
    };
  }

  /**
   * POST /auth/logout
   * Logout — hapus refresh token dari DB
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.user_id);
  }

  /**
   * POST /auth/forgot-password
   * Kirim OTP ke email untuk reset password
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /**
   * POST /auth/reset-password
   * Reset password menggunakan OTP
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }
}
