import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { PsychologistService } from './psychologist.service';
import {
  CreatePsychologistProfileDto,
  UpdatePsychologistProfileDto,
  QueryPsychologistDto,
} from './dto/psychologist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES — /psychologists
// ══════════════════════════════════════════════════════════════════════════════
@Controller('psychologists')
export class PsychologistController {
  constructor(private readonly psychologistService: PsychologistService) {}

  /**
   * GET /psychologists
   * Daftar psikolog aktif — Guest & semua user
   */
  @Get()
  findAll(@Query() query: QueryPsychologistDto) {
    return this.psychologistService.findAll(query);
  }

  /**
   * GET /psychologists/specialties
   * Semua kategori spesialisasi — untuk filter di UI
   */
  @Get('specialties')
  getAllSpecialties() {
    return this.psychologistService.getAllSpecialties();
  }

  /**
   * GET /psychologists/:id
   * Detail psikolog by ID — Guest & semua user
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.psychologistService.findOne(id);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PSYCHOLOGIST ROUTES — /psychologists/me/** (butuh login + role PSYCHOLOGIST)
// ══════════════════════════════════════════════════════════════════════════════
@Controller('psychologist/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PSYCHOLOGIST')
export class PsychologistMeController {
  constructor(private readonly psychologistService: PsychologistService) {}

  /**
   * POST /psychologist/me/profile
   * Buat profil psikolog untuk diri sendiri
   */
  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  createProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePsychologistProfileDto,
  ) {
    return this.psychologistService.createProfile(req.user.user_id, dto);
  }

  /**
   * GET /psychologist/me/profile
   * Lihat profil sendiri (lengkap)
   */
  @Get('profile')
  getMyProfile(@Req() req: AuthenticatedRequest) {
    return this.psychologistService.getMyProfile(req.user.user_id);
  }

  /**
   * PATCH /psychologist/me/profile
   * Update profil sendiri
   */
  @Patch('profile')
  updateMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePsychologistProfileDto,
  ) {
    return this.psychologistService.updateMyProfile(req.user.user_id, dto);
  }

  /**
   * GET /psychologist/me/dashboard
   * Statistik & ringkasan aktivitas psikolog
   */
  @Get('dashboard')
  getDashboard(@Req() req: AuthenticatedRequest) {
    return this.psychologistService.getMyDashboard(req.user.user_id);
  }

  /**
   * GET /psychologist/me/patients
   * Daftar pasien (user yang pernah booking)
   */
  @Get('patients')
  getPatients(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.psychologistService.getMyPatients(
      req.user.user_id,
      page,
      limit,
    );
  }

  /**
   * GET /psychologist/me/schedules
   * Jadwal praktik milik sendiri
   */
  @Get('schedules')
  getSchedules(@Req() req: AuthenticatedRequest) {
    return this.psychologistService.getMySchedules(req.user.user_id);
  }
}
