import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // PrismaService tersedia di seluruh app tanpa perlu import ulang
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
