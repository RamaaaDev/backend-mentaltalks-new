import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtp(to: string, otpCode: string, type: string) {
    const subjects: Record<string, string> = {
      VERIFY_EMAIL: 'Verifikasi Email Anda',
      RESET_PASSWORD: 'Reset Password',
    };

    const messages: Record<string, string> = {
      VERIFY_EMAIL: `Kode OTP untuk verifikasi email Anda`,
      RESET_PASSWORD: `Kode OTP untuk reset password Anda`,
    };

    const subject = subjects[type] || 'Kode OTP';
    const message = messages[type] || 'Kode OTP Anda';

    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get('SMTP_FROM', 'App')} " <${this.configService.get('MAIL_USER')}>`,
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #333;">${subject}</h2>
            <p>${message} adalah:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; margin: 24px 0;">
              ${otpCode}
            </div>
            <p style="color: #666; font-size: 14px;">Kode ini berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapapun.</p>
          </div>
        `,
      });

      this.logger.log(`OTP [${type}] terkirim ke ${to}`);
    } catch (error) {
      this.logger.error(`Gagal mengirim OTP ke ${to}`, error);
      // Jangan throw error — jangan bocorkan kegagalan email ke client
    }
  }
}
