import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  QueryScheduleDto,
} from './dto/schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';

// ── PUBLIC ────────────────────────────────────────────────────────────────────
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * GET /schedules
   * Ambil jadwal yang tersedia (belum dibooking)
   * Optional filter: psychologistId, type, from, to
   */
  @Get()
  findAvailable(@Query() query: QueryScheduleDto) {
    return this.scheduleService.findAvailable(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.scheduleService.findOne(id);
  }
}

// ── PSYCHOLOGIST ──────────────────────────────────────────────────────────────
@Controller('psychologist/me/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PSYCHOLOGIST')
export class ScheduleMeController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * POST /psychologist/me/schedules
   * Buat jadwal baru
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(req.user.user_id, dto);
  }

  /**
   * PATCH /psychologist/me/schedules/:id
   * Update jadwal milik sendiri
   */
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(req.user.user_id, id, dto);
  }

  /**
   * DELETE /psychologist/me/schedules/:id
   * Hapus jadwal (hanya jika belum dibooking)
   */
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scheduleService.remove(req.user.user_id, id);
  }
}
