import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminUserController } from './user/admin-user.controller';
import { AdminPsychologistService } from './psychologist/admin-psychologist.service';
import { AdminPsyschologistController } from './psychologist/admin-pscyhologist.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminService } from './admin.service';
import { AdminUserService } from './user/admin-user.service';

@Module({
  controllers: [
    AdminController,
    AdminPsyschologistController,
    AdminUserController,
  ],
  providers: [
    PrismaService,
    AdminService,
    AdminPsychologistService,
    AdminUserService,
  ],
})
export class AdminModule {}
