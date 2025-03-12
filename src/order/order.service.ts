import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orders } from './entities/order.entity';
import { ShopifyService } from '../config/shopify.service';
import { ProductService } from '../product/product.service';
import { User } from '../user/entities/user.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Orders)
    private ordersRepository: Repository<Orders>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private shopifyService: ShopifyService,
    private productService: ProductService
  ) {}

  async syncOrdersFromShopify(userId: string) {
    try {
      console.log('Iniciando sincronización de órdenes para usuario:', userId);
      
      // Obtener el usuario y su shopifyCustomerId
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user || !user.shopifyCustomerId) {
        throw new BadRequestException('Usuario no encontrado o sin ID de cliente de Shopify');
      }

      // Obtener pedidos de Shopify
      const shopifyOrders = await this.shopifyService.getCustomerOrders(user.shopifyCustomerId);
      console.log('Órdenes obtenidas de Shopify:', shopifyOrders);

      // Procesar cada pedido
      for (const shopifyOrder of shopifyOrders) {
        // Verificar si el pedido ya existe en nuestra base de datos
        const existingOrder = await this.ordersRepository.findOne({
          where: [
            { shopifyOrderId: shopifyOrder.id.toString() },
            { shopifyDraftOrderId: shopifyOrder.id.toString() }
          ]
        });

        if (!existingOrder) {
          console.log('Creando nueva orden:', shopifyOrder.order_number);
          // Crear nuevo pedido en nuestra base de datos
          const newOrder = this.ordersRepository.create({
            userId,
            customerId: user.shopifyCustomerId,
            shopifyOrderId: shopifyOrder.id.toString(),
            orderNumber: shopifyOrder.order_number.toString(),
            totalPrice: Number(shopifyOrder.total_price),
            status: shopifyOrder.financial_status || 'pending',
            lineItems: shopifyOrder.line_items.map(item => ({
              variantId: item.variant_id,
              quantity: item.quantity
            })),
            createdAt: new Date(shopifyOrder.created_at),
            updatedAt: new Date(shopifyOrder.updated_at)
          });

          await this.ordersRepository.save(newOrder);
        } else {
          console.log('Actualizando orden existente:', shopifyOrder.order_number);
          // Actualizar el estado si ha cambiado
          if (existingOrder.status !== shopifyOrder.financial_status) {
            existingOrder.status = shopifyOrder.financial_status || 'pending';
            existingOrder.updatedAt = new Date(shopifyOrder.updated_at);
            // Si la orden era un draft y ahora es una orden real, actualizar los IDs
            if (existingOrder.shopifyDraftOrderId && !existingOrder.shopifyOrderId) {
              existingOrder.shopifyOrderId = shopifyOrder.id.toString();
              existingOrder.shopifyDraftOrderId = null;
              existingOrder.orderNumber = shopifyOrder.order_number.toString();
              existingOrder.totalPrice = Number(shopifyOrder.total_price);
            }
            await this.ordersRepository.save(existingOrder);
          }
        }
      }

      // Obtener todas las órdenes actualizadas del usuario
      const updatedOrders = await this.ordersRepository.find({
        where: { userId },
        order: {
          createdAt: 'DESC'
        }
      });

      console.log('Sincronización completada, órdenes actualizadas:', updatedOrders.length);
      return updatedOrders;
    } catch (error) {
      console.error('Error en sincronización de órdenes:', error);
      throw error;
    }
  }

  async createLocalOrder(orderData: {
    userId: string;
    customerId: string;
    shopifyOrderId?: string;
    shopifyDraftOrderId?: string;
    orderNumber?: string;
    totalPrice?: number;
    status: string;
    lineItems: Array<{
      variantId: string;
      quantity: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    try {
      // Reservar el stock para cada item
      if (orderData.lineItems) {
        for (const item of orderData.lineItems) {
          await this.productService.reserveStock(
            item.variantId,
            item.quantity
          );
        }
      }

      // Crear la orden en la base de datos local
      const order = this.ordersRepository.create(orderData);
      return await this.ordersRepository.save(order);
    } catch (error) {
      // Si hay un error, intentar liberar el stock reservado
      if (orderData.lineItems) {
        for (const item of orderData.lineItems) {
          try {
            await this.productService.releaseStockReservation(
              item.variantId,
              item.quantity
            );
          } catch (releaseError) {
            console.error('Error liberando stock reservado:', releaseError);
          }
        }
      }
      throw error;
    }
  }

  create(createOrderDto: CreateOrderDto) {
    return 'This action adds a new order';
  }

  findAll() {
    return `This action returns all order`;
  }

  async findOne(id: string) {
    return this.ordersRepository.findOne({
      where: { id }
    });
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }

  async findByStatusAndUser(status: string, userId: string) {
    console.log('Buscando órdenes con:', { status, userId });
    
    const orders = await this.ordersRepository.find({
      where: {
        userId,
        status
      },
      order: {
        createdAt: 'DESC'
      }
    });

    console.log('Órdenes encontradas:', orders);
    return orders;
  }
}
