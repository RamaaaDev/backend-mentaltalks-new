import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigModule } from '@nestjs/config';
import { ContactController } from './mail-resend.controller';
import { ContactService } from './mail-resend.service';

@Module({
  imports: [ConfigModule],
  controllers: [ContactController],
  providers: [MailService, ContactService],
  exports: [MailService],
})
export class MailModule {}
