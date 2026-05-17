import { Module } from '@nestjs/common';
import {
  PaymentController,
  PaymentAdminController,
} from './payment.controller';
import { PaymentService } from './payment.service';
import { QrisService } from './qris.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MeetingModule } from '../meeting/meeting.module';

@Module({
  imports: [PrismaModule, AuthModule, MeetingModule],
  controllers: [PaymentController, PaymentAdminController],
  providers: [PaymentService, QrisService],
  exports: [PaymentService],
})
export class PaymentModule {}
