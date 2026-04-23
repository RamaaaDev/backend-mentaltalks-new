import { BookingStatus, MeetingType } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  scheduleId: string; // schedule yang dipilih user

  @IsOptional()
  @IsUUID()
  couponCode?: string; // kode kupon (opsional)

  @IsOptional()
  @IsString()
  @MaxLength(500)
  booking_notes?: string; // keluhan awal
}

export class QueryBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsEnum(MeetingType)
  type?: MeetingType;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export class UpadateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
