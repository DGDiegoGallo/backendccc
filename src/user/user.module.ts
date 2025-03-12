import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orders } from 'src/order/entities/order.entity';
import { ShopifyService } from '../config/shopify.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Orders])],
  controllers: [UserController],
  providers: [UserService, UserRepository, ShopifyService],
  exports: [UserService]
})
export class UserModule {}
