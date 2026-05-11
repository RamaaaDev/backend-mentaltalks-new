import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MeetingType } from '@prisma/client';

export class CreateScheduleDto {
  @IsDateString()
  schedule_startTime: string;

  @IsDateString()
  schedule_endTime: string;

  @IsEnum(MeetingType)
  schedule_type: MeetingType;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  schedule_price: number;

  @IsOptional()
  @IsUUID()
  schedule_locationId?: string;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsDateString()
  schedule_startTime?: string;

  @IsOptional()
  @IsDateString()
  schedule_endTime?: string;

  @IsOptional()
  @IsEnum(MeetingType)
  schedule_type?: MeetingType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  schedule_price?: number;

  @IsOptional()
  @IsUUID()
  schedule_locationId?: string;
}

export class QueryScheduleDto {
  @IsOptional()
  @IsString()
  psychologistId?: string;

  @IsOptional()
  @IsEnum(MeetingType)
  type?: MeetingType;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
