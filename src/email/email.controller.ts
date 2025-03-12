import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}


  @Post('contact')
  async sendContactEmail(@Body() body: { name: string; email: string; message: string }) {
    return this.emailService.sendContactEmail(body.name, body.email, body.message);
  }

}
