import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, BadRequestException, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShopifyService } from '../config/shopify.service';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly shopifyService: ShopifyService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrder(
    @Body() orderData: {
      customerId: string;
      userId: string;
      lineItems: Array<{
        variantId: string;
        quantity: number;
      }>;
      shippingAddress?: {
        address1: string;
        city: string;
        province: string;
        zip: string;
        country: string;
      };
    }
  ) {
    try {
      console.log('Recibida petición para crear orden:', orderData);

      // Verificar que el customerId sea válido
      if (!orderData.customerId) {
        throw new BadRequestException('Se requiere el ID del cliente');
      }

      // Verificar que el userId sea válido
      if (!orderData.userId) {
        throw new BadRequestException('Se requiere el ID del usuario');
      }

      // Verificar que haya al menos un producto
      if (!orderData.lineItems || orderData.lineItems.length === 0) {
        throw new BadRequestException('Se requiere al menos un producto');
      }

      // Crear la orden en Shopify
      const shopifyOrder = await this.shopifyService.createOrder({
        ...orderData,
        // Asegurarse de que los IDs de las variantes estén en el formato correcto
        lineItems: orderData.lineItems.map(item => ({
          ...item,
          variantId: item.variantId.includes('gid://') 
            ? item.variantId.split('/').pop() || item.variantId
            : item.variantId
        }))
      });

      console.log('Orden creada en Shopify:', shopifyOrder);

      // Guardar la orden en nuestra base de datos
      const localOrder = await this.orderService.createLocalOrder({
        userId: orderData.userId,
        customerId: orderData.customerId,
        shopifyOrderId: shopifyOrder.id.toString(),
        orderNumber: shopifyOrder.order_number,
        totalPrice: Number(shopifyOrder.total_price),
        status: shopifyOrder.financial_status,
        lineItems: orderData.lineItems,
        createdAt: new Date(shopifyOrder.created_at),
        updatedAt: new Date(shopifyOrder.updated_at)
      });

      return {
        shopifyOrder,
        localOrder
      };
    } catch (error) {
      console.error('Error al crear orden:', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query('status') status?: string, @Query('userId') userId?: string) {
    try {
      console.log('Recibida petición de órdenes con:', { status, userId });
      
      let orders;
      if (status && userId) {
        orders = await this.orderService.findByStatusAndUser(status, userId);
      } else {
        orders = await this.orderService.findAll();
      }

      console.log('Enviando respuesta:', orders);
      return orders;
    } catch (error) {
      console.error('Error al obtener órdenes:', error);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync/:userId')
  async syncOrders(@Param('userId') userId: string) {
    try {
      return await this.orderService.syncOrdersFromShopify(userId);
    } catch (error) {
      console.error('Error syncing orders:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('payment-session')
  async createPaymentSession(@Body() body: { orderId: string }) {
    try {
      // Obtener la orden de nuestra base de datos
      const order = await this.orderService.findOne(body.orderId);
      
      if (!order) {
        throw new Error('Orden no encontrada');
      }

      // Crear la sesión de pago en Shopify
      const paymentSession = await this.shopifyService.createPaymentSession(
        order.lineItems,
        order.customerId
      );

      return {
        paymentUrl: paymentSession.paymentUrl
      };
    } catch (error) {
      console.error('Error al crear sesión de pago:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout')
  async createCheckout(
    @Body() orderData: {
      customerId: string;
      userId: string;
      lineItems: Array<{
        variantId: string;
        quantity: number;
      }>;
    }
  ) {
    try {
      console.log('Creando checkout para:', orderData);

      // Crear directamente una draft order y obtener la URL de pago
      const { paymentUrl, draftOrderId } = await this.shopifyService.createPaymentSession(
        orderData.lineItems,
        orderData.customerId
      );

      // Guardar la referencia de la draft order en nuestra base de datos
      const localOrder = await this.orderService.createLocalOrder({
        userId: orderData.userId,
        customerId: orderData.customerId,
        shopifyDraftOrderId: draftOrderId,
        status: 'pending',
        lineItems: orderData.lineItems,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        checkoutUrl: paymentUrl,
        orderId: localOrder.id
      };
    } catch (error) {
      console.error('Error al crear checkout:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('pending/:userId')
  async getPendingOrders(@Param('userId') userId: string) {
    try {
      // Primero sincronizamos las órdenes con Shopify
      await this.orderService.syncOrdersFromShopify(userId);

      // Luego obtenemos las órdenes pendientes
      const pendingOrders = await this.orderService.findByStatusAndUser('pending', userId);
      
      return pendingOrders;
    } catch (error) {
      console.error('Error al obtener órdenes pendientes:', error);
      throw error;
    }
  }
}
