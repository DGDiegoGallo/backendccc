import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv'

dotenv.config()
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configuración de CORS
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      /\.ngrok-free\.app$/  // Para URLs de ngrok
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-JWT-Token'  // Para el token JWT cuando usamos ngrok
    ]
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
