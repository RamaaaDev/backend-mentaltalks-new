import { BookingStatus, MeetingType } from '@prisma/client';
import { IsOptional, IsEnum } from 'class-validator';

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
