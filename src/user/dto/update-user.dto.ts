import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsString()
  user_phone?: string;

  @IsOptional()
  @IsDateString()
  user_birthday?: string;

  @IsOptional()
  @IsString()
  user_photos?: string;
}
