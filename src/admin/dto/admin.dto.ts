import { IsString } from 'class-validator';

export class CreateAdminProfileDto {
  @IsString()
  admin_specialty: string;
}
