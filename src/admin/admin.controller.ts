import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/auth/guards/roles.guard';
import { AdminService } from './admin.service';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';
import { CreateAdminProfileDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('profile')
  @Roles('ADMIN')
  createMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAdminProfileDto,
  ) {
    return this.adminService.createMyProfile(req.user.user_id, dto);
  }
}
