import { IsOptional, IsString, IsDateString, IsEmail } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  user_username?: string;

  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsEmail()
  user_email?: string;

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
