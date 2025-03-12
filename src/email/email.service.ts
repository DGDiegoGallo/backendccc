import { Injectable } from '@nestjs/common';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import * as nodemailer from 'nodemailer';
@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',  
      auth: {
        user: process.env.EMAIL_USER,  // Tu correo
        pass: process.env.EMAIL_PASS,  // Tu contraseña o App Password
      },
    });
  }

  async sendContactEmail(name: string, email: string, message: string) {
    if (!process.env.RECEIVER_EMAIL) {
      throw new Error('El destinatario del correo no está definido');
    }
  
    const mailOptions = {
      from: `"Formulario de Contacto" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL.trim(), // Trim elimina espacios en blanco
      subject: 'Nuevo mensaje del formulario de contacto',
      text: `Nombre: ${name}\nCorreo: ${email}\nMensaje: ${message}`,
      replyTo: email,
    };
    
  
    try {
      await this.transporter.sendMail(mailOptions);
      return { message: 'Correo enviado correctamente' };
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      throw new Error('No se pudo enviar el correo');
    }
  }
  
}