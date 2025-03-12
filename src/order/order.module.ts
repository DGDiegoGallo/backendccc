import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ShopifyService } from '../config/shopify.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orders } from './entities/order.entity';
import { ProductModule } from '../product/product.module';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Orders, User]),
    ProductModule
  ],
  controllers: [OrderController],
  providers: [OrderService, ShopifyService],
})
export class OrderModule {}
