import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv'
import { HttpExceptionFilter } from './filters/http-exception.filter';

dotenv.config()
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('Documentación de la API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  // Configuración de CORS
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      /\.vercel\.app$/,  // Para URLs de Vercel
      /\.ngrok-free\.app$/  // Para URLs de ngrok
      // Agrega aquí otros dominios permitidos en producción
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-JWT-Token'
    ]
  });

  // Asegurarse de que la aplicación escuche en '0.0.0.0' para Vercel
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
