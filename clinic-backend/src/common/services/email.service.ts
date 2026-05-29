import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendKey) {
      this.resend = new Resend(resendKey);
    } else {
      // Fallback to Nodemailer if configured
      const host = this.configService.get<string>('SMTP_HOST');
      if (host) {
        this.transporter = nodemailer.createTransport({
          host,
          port: this.configService.get<number>('SMTP_PORT', 587),
          secure: this.configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
          },
        });
      }
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: this.configService.get<string>('EMAIL_FROM') || 'noreply@clinic.com',
          to,
          subject,
          html,
        });
        return true;
      } else if (this.transporter) {
        await this.transporter.sendMail({
          from: this.configService.get<string>('EMAIL_FROM') || 'noreply@clinic.com',
          to,
          subject,
          html,
        });
        return true;
      } else {
        this.logger.warn('No email provider configured. Skipping email send.');
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }
}
