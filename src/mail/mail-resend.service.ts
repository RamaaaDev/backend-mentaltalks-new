import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SendContactDto } from './dto/mail.dto';

interface ResendError {
  message: string;
}

interface ResendResponse {
  error: ResendError | null;
}

@Injectable()
export class ContactService {
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly toEmail: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('RESEND_API_KEY');
    this.fromEmail = this.config.getOrThrow<string>('RESEND_FROM_EMAIL');
    this.toEmail = this.config.getOrThrow<string>('RESEND_TO_EMAIL');
    this.resend = new Resend(apiKey);
  }

  async sendContactEmail(dto: SendContactDto): Promise<{ message: string }> {
    const { email, fullName, subjek, message } = dto;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00BDFD;">Pesan Baru dari Formulir Kontak</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #555; width: 120px; vertical-align: top;"><strong>Nama</strong></td>
            <td style="padding: 8px 0; color: #222;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555; vertical-align: top;"><strong>Email</strong></td>
            <td style="padding: 8px 0; color: #222;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555; vertical-align: top;"><strong>Subjek</strong></td>
            <td style="padding: 8px 0; color: #222;">${subjek}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555; vertical-align: top;"><strong>Pesan</strong></td>
            <td style="padding: 8px 0; color: #222; white-space: pre-line;">${message}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">Dikirim dari formulir kontak MentalTalks</p>
      </div>
    `;

    const result = (await this.resend.emails.send({
      from: this.fromEmail,
      to: this.toEmail,
      replyTo: email,
      subject: `[Kontak] ${subjek}`,
      html,
    })) as ResendResponse;

    if (result.error !== null && result.error !== undefined) {
      throw new InternalServerErrorException(
        `Gagal mengirim email: ${result.error.message}`,
      );
    }

    return { message: 'Pesan berhasil dikirim' };
  }
}
