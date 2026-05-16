import {
  Controller,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { QueryBookingDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';

// ─── USER & PSYCHOLOGIST ──────────────────────────────────────────────────────
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /** GET /bookings/me — Daftar booking milik user sendiri */
  @Get('me')
  @Roles('USER')
  getMyBookings(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() query?: QueryBookingDto,
  ) {
    return this.bookingService.getMyBookings(
      req.user.user_id,
      page,
      limit,
      query?.status,
    );
  }

  /** GET /bookings/psychologist — Psikolog lihat booking masuk */
  @Get('psychologist')
  @Roles('PSYCHOLOGIST')
  getPsychologistBookings(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() query?: QueryBookingDto,
  ) {
    return this.bookingService.getPsychologistBookings(
      req.user.user_id,
      page,
      limit,
      query?.status,
      query?.type,
    );
  }

  /** GET /bookings/:id — Detail booking (user/psikolog/admin) */
  @Get(':id')
  @Roles('USER', 'PSYCHOLOGIST', 'ADMIN')
  getBookingDetail(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookingService.getBookingDetail(
      req.user.user_id,
      id,
      req.user.user_role,
    );
  }
}
