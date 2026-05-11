import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  LocationAdminController,
  LocationController,
} from './location.controller';
import { LocationService } from './location.service';

@Module({
  imports: [PrismaModule],
  controllers: [LocationController, LocationAdminController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
