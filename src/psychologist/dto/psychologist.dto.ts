import {
  IsString,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
  IsNumber,
  IsObject,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── CREATE ───────────────────────────────────────────────────────────────────
export class CreatePsychologistProfileDto {
  @IsString()
  psychologist_name: string;

  @IsArray()
  @IsString({ each: true })
  psychologist_education: string[];

  @IsString()
  @MaxLength(1000)
  psychologist_bio: string;

  @IsOptional()
  @IsString()
  psychologist_quotes?: string;

  @IsArray()
  @IsString({ each: true })
  psychologist_specialties: string[];

  @IsInt()
  @Min(0)
  @Type(() => Number)
  psychologist_yearsExperience: number;
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export class UpdatePsychologistProfileDto {
  @IsOptional()
  @IsString()
  psychologist_name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  psychologist_education?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  psychologist_bio?: string;

  @IsOptional()
  @IsString()
  psychologist_quotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  psychologist_specialties?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  psychologist_yearsExperience?: number;
}

// ─── QUERY / FILTER ───────────────────────────────────────────────────────────
export class QueryPsychologistDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

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

  @IsOptional()
  @IsString()
  sortBy?: 'rating' | 'yearsExperience' | 'createdAt' = 'createdAt';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}

export class YearlyDataDto {
  @IsNumber()
  quarter: number;

  @IsNumber()
  uniqueUsers: number;

  @IsNumber()
  totalBookings: number;
}

export class BookingScheduleDto {
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  endTime: Date;
}

export class BookingUserDto {
  @IsString()
  userId: string;

  @IsString()
  userName: string;

  @IsString()
  @IsOptional()
  userPhotos?: string | null;
}

export class BookingWithRelationsDto {
  @IsString()
  bookingId: string;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsEnum(['ONLINE', 'OFFLINE'])
  type: 'ONLINE' | 'OFFLINE';

  @IsString()
  status: string;

  @IsObject()
  @Type(() => BookingScheduleDto)
  schedule: BookingScheduleDto;

  @IsObject()
  @Type(() => BookingUserDto)
  user: BookingUserDto;
  booking_user: any;
}
