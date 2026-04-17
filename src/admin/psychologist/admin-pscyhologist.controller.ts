import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/auth/guards/roles.guard';
import { AdminPsychologistService } from './admin-psychologist.service';
import {
  QueryPsychologistDto,
  UpdatePsychologistProfileDto,
} from 'src/psychologist/dto/psychologist.dto';

@Controller('admin/psychologist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPsyschologistController {
  constructor(
    private readonly adminPsychologistService: AdminPsychologistService,
  ) {}

  /**
   * GET /admin/psychologists/dashboard
   * Statistik global semua psikolog
   */
  @Get('dashboard')
  adminDashboard() {
    return this.adminPsychologistService.adminDashboard();
  }

  /**
   * GET /admin/psychologists
   * Semua psikolog (aktif & nonaktif) + filter
   */
  @Get()
  adminFindAll(@Query() query: QueryPsychologistDto) {
    return this.adminPsychologistService.adminFindAll(query);
  }

  /**
   * PATCH /admin/psychologists/:id
   * Update profil psikolog manapun
   */
  @Patch(':id')
  adminUpdateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePsychologistProfileDto,
  ) {
    return this.adminPsychologistService.adminUpdateProfile(id, dto);
  }

  /**
   * PATCH /admin/psychologists/:id/toggle-active
   * Aktifkan / nonaktifkan akun psikolog
   */
  @Patch(':id/toggle-active')
  @HttpCode(HttpStatus.OK)
  adminToggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminPsychologistService.adminToggleActive(id);
  }
}
