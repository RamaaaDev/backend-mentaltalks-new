import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import {
  ScheduleController,
  ScheduleMeController,
} from './schedule.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScheduleController, ScheduleMeController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
