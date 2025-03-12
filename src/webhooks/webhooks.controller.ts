import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orders } from '../order/entities/order.entity';
import { ProductService } from '../product/product.service';

interface ShopifyOrderPayload {
  order_number: string;
  id: number;
  total_price: string;
  financial_status: string;
  line_items: Array<{
    variant_id: string;
    quantity: number;
  }>;
  customer: {
    id: number;
    email: string;
  };
}

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private configService: ConfigService,
    private productService: ProductService,
    @InjectRepository(Orders)
    private ordersRepository: Repository<Orders>
  ) {}

  private verifyWebhook(payload: any, hmac: string): boolean {
    const secret = this.configService.get<string>('SHOPIFY_WEBHOOK_SECRET');
    const calculatedHmac = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('base64');
    return calculatedHmac === hmac;
  }

  @Post('orders/paid')
  async handleOrderPaid(
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Body() payload: ShopifyOrderPayload,
  ) {
    // Verificar la autenticidad del webhook
    const verified = this.verifyWebhook(payload, hmac);
    if (!verified) {
      throw new HttpException('Webhook verification failed', HttpStatus.UNAUTHORIZED);
    }

    try {
      // Buscar la orden en nuestra base de datos
      const order = await this.ordersRepository.findOne({
        where: { shopifyOrderId: payload.id.toString() }
      });

      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      // Si el pago fue exitoso, confirmar la reserva de stock
      if (payload.financial_status === 'paid') {
        for (const item of payload.line_items) {
          await this.productService.confirmStockReservation(
            item.variant_id,
            item.quantity
          );
        }
      }
      // Si el pago falló, liberar la reserva de stock
      else if (['voided', 'refunded', 'failed'].includes(payload.financial_status)) {
        for (const item of payload.line_items) {
          await this.productService.releaseStockReservation(
            item.variant_id,
            item.quantity
          );
        }
      }

      // Actualizar el estado de la orden
      order.status = payload.financial_status;
      order.updatedAt = new Date();
      
      // Guardar los cambios
      await this.ordersRepository.save(order);

      console.log('Orden actualizada:', {
        orderNumber: payload.order_number,
        status: payload.financial_status
      });

      return { status: 'success' };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new HttpException('Error processing webhook', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 