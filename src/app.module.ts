import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { CartModule } from './cart/cart.module';
import { CategoryModule } from './category/category.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static'; // Mantener ServeStaticModule
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import typeorm from "./dbConfig/typeorm.config"
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    EmailModule,
    ConfigModule.forRoot({ isGlobal: true, load: [typeorm] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('typeorm'),
    }),
    UserModule, OrderModule, ProductModule, OrderItemsModule, CartModule, CategoryModule, AuthModule, EmailModule, WebhooksModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
