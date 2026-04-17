import { Module } from '@nestjs/common';
import {
  PsychologistController,
  PsychologistMeController,
} from './psychologist.controller';
import { PsychologistService } from './psychologist.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PsychologistController, // /psychologists      — publik
    PsychologistMeController, // /psychologist/me    — role PSYCHOLOGIST
  ],
  providers: [PsychologistService],
  exports: [PsychologistService],
})
export class PsychologistModule {}
