import {
  IsString,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TitlePsychologist } from '@prisma/client';

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

  @IsString()
  @MaxLength(100)
  psychologist_sipp: string;

  @IsString()
  psychologist_location: string;

  @IsInt()
  psychologist_sessionDone: number;

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
  @IsEnum(TitlePsychologist)
  psychologist_title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  psychologist_education?: string[];

  @IsString()
  psychologist_location: string;

  @IsInt()
  psychologist_sessionDone: number;

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

  @IsOptional()
  @IsArray()
  @IsString()
  psychologist_methode?: string[];
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

export interface BookingWithRelations {
  booking_id: string;
  booking_createdAt: Date;
  booking_type: 'ONLINE' | 'OFFLINE';
  booking_status: string;
  booking_schedule: {
    schedule_startTime: Date;
    schedule_endTime: Date;
  };
  booking_user: {
    user_id: string;
    user_name: string;
    user_photos: string | null;
  };
}
