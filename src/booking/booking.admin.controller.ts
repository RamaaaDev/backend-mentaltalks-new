import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/auth/guards/roles.guard';
import { BookingService } from './booking.service';
import { QueryBookingDto, UpadateBookingStatusDto } from './dto/booking.dto';

@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BookingAdminController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  adminGetAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() query?: QueryBookingDto,
  ) {
    return this.bookingService.adminGetAllBookings(page, limit, query?.status);
  }

  @Patch(':id/status')
  adminUpdateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') dto: UpadateBookingStatusDto,
  ) {
    return this.bookingService.adminUpdateBookingStatus(id, dto.status);
  }
}
