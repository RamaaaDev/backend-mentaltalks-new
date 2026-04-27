import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ContactService } from './mail-resend.service';
import { SendContactDto } from './dto/mail.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  sendContact(@Body() dto: SendContactDto): Promise<{ message: string }> {
    return this.contactService.sendContactEmail(dto);
  }
}
