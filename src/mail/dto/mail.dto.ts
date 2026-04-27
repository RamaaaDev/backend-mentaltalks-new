import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendContactDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subjek: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
