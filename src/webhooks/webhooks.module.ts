import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orders } from '../order/entities/order.entity';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Orders]),
    ProductModule
  ],
  controllers: [WebhooksController]
})
export class WebhooksModule {} 