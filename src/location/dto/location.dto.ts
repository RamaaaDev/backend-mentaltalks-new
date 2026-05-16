import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  location_name: string;

  @IsString()
  @IsNotEmpty()
  location_address: string;

  @IsString()
  @IsNotEmpty()
  location_addressDetail: string;

  @IsString()
  @IsOptional()
  location_navigation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  location_photos?: string[];
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}
