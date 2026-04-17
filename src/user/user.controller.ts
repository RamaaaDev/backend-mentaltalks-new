import {
  Controller,
  Get,
  UseGuards,
  Req,
  Patch,
  Body,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';
import { UpdateUserProfileDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) // Semua route butuh login
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /users/me
   * Ambil profil diri sendiri — semua role bisa akses
   */
  @Get('me')
  getMyProfile(@Req() req: AuthenticatedRequest) {
    return this.userService.getMyProfile(req.user.user_id);
  }

  @Patch('me')
  updateMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.userService.updateMyProfile(req.user.user_id, dto);
  }

  @Delete('me')
  deleteMyAccount(@Req() req: AuthenticatedRequest) {
    return this.userService.deleteMyAccount(req.user.user_id);
  }
}
