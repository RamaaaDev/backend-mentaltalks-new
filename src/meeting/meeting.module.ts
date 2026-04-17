import { Module } from '@nestjs/common';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';
import { StreamService } from './stream.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MeetingController],
  providers: [MeetingService, StreamService],
  exports: [MeetingService, StreamService],
})
export class MeetingModule {}
