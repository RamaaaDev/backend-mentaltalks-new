import { Module } from '@nestjs/common';
import {
  CouponController,
  CouponAdminController,
  CouponUserController,
} from './coupon.controller';
import { CouponService } from './coupon.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CouponController, CouponAdminController, CouponUserController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
