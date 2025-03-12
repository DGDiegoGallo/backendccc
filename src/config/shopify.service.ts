import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ShopifyService {
  private shopifyDomain: string;
  private accessToken: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.shopifyDomain = this.configService.get<string>('SHOPIFY_SHOP_NAME');
    this.accessToken = this.configService.get<string>('SHOPIFY_ACCESS_TOKEN');
    this.baseUrl = `https://${this.shopifyDomain}/admin/api/2024-01`;
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `+57${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('57')) {
      return `+${cleaned}`;
    }
    return `+57${cleaned.slice(-10)}`;
  }

  async getAllCustomers(page?: number, limit?: number) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/customers.json`,
        {
          params: {
            ...(limit && { limit }),
            ...(page && { page }),
            fields: 'id,email,first_name,last_name,phone,addresses,note,accepts_marketing,orders_count,total_spent,last_order_id'
          },
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        customers: response.data.customers,
        pagination: {
          currentPage: page || 1,
          limit: limit || 50,
          total: parseInt(response.headers['x-shopify-shop-api-call-limit']?.split('/')[0] || '0')
        }
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error getting Shopify customers:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      throw error;
    }
  }

  async searchCustomers(query: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/customers/search.json`,
        {
          params: {
            query,
            fields: 'id,email,first_name,last_name,phone,addresses,note,accepts_marketing,orders_count,total_spent,last_order_id'
          },
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.customers;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error searching Shopify customers:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      throw error;
    }
  }

  async createCustomer(userData: {
    email: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    note?: string;
    acceptsMarketing?: boolean;
    addresses?: Array<{
      address1?: string;
      city?: string;
      province?: string;
      zip?: string;
      country?: string;
    }>;
  }) {
    try {
      console.log('Creating customer with data:', userData);
      
      const response = await axios.post(
        `${this.baseUrl}/customers.json`,
        {
          customer: {
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone ? this.formatPhoneNumber(userData.phone) : undefined,
            note: userData.note,
            accepts_marketing: userData.acceptsMarketing,
            addresses: userData.addresses ? userData.addresses.map(address => ({
              address1: address.address1,
              city: address.city,
              province: address.province,
              zip: address.zip,
              country: "Colombia"
            })) : []
          }
        },
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Shopify response:', response.data);
      return response.data.customer;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Shopify error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(`Error creating Shopify customer: ${JSON.stringify(error.response?.data || error.message)}`);
      }
      throw error;
    }
  }

  async getCustomerById(shopifyCustomerId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/customers/${shopifyCustomerId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.customer;
    } catch (error) {
      console.error('Error getting Shopify customer:', error);
      throw error;
    }
  }

  async updateCustomer(shopifyCustomerId: string, userData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    note?: string;
    acceptsMarketing?: boolean;
    addresses?: Array<{
      address1?: string;
      city?: string;
      province?: string;
      zip?: string;
      country?: string;
    }>;
  }) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/customers/${shopifyCustomerId}.json`,
        {
          customer: {
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone ? this.formatPhoneNumber(userData.phone) : undefined,
            note: userData.note,
            accepts_marketing: userData.acceptsMarketing,
            addresses: userData.addresses ? userData.addresses.map(address => ({
              address1: address.address1,
              city: address.city,
              province: address.province,
              zip: address.zip,
              country: "Colombia"
            })) : undefined
          }
        },
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.customer;
    } catch (error) {
      console.error('Error updating Shopify customer:', error);
      throw error;
    }
  }

  async createOrder(orderData: {
    customerId: string;
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
  }) {
    try {
      console.log('Preparando datos para crear orden en Shopify:', {
        customerId: orderData.customerId,
        lineItems: orderData.lineItems,
        shippingAddress: orderData.shippingAddress
      });

      const formattedLineItems = orderData.lineItems.map(item => {
        const variantId = item.variantId.includes('gid://') 
          ? item.variantId.split('/').pop() 
          : item.variantId;
        
        console.log('ID de variante formateado:', {
          original: item.variantId,
          formatted: variantId
        });

        return {
          variant_id: variantId,
          quantity: item.quantity
        };
      });

      const orderPayload = {
        order: {
          customer: { id: orderData.customerId },
          line_items: formattedLineItems,
          shipping_address: orderData.shippingAddress ? {
            ...orderData.shippingAddress,
            country: "Colombia"
          } : undefined,
          financial_status: "pending",
          inventory_behaviour: "decrement_ignoring_policy",
          send_receipt: true,
          send_fulfillment_receipt: true
        }
      };

      console.log('Enviando petición a Shopify:', {
        url: `${this.baseUrl}/orders.json`,
        payload: JSON.stringify(orderPayload, null, 2)
      });

      const response = await axios.post(
        `${this.baseUrl}/orders.json`,
        orderPayload,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Respuesta de Shopify:', {
        status: response.status,
        data: JSON.stringify(response.data, null, 2)
      });

      return response.data.order;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error detallado de Shopify:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: JSON.parse(error.config?.data || '{}')
          }
        });
      }
      throw error;
    }
  }

  async getCustomerOrders(customerId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/customers/${customerId}/orders.json`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.orders;
    } catch (error) {
      console.error('Error getting customer orders from Shopify:', error);
      throw error;
    }
  }

  async createPaymentSession(lineItems: Array<{ variantId: string; quantity: number }>, customerId: string) {
    try {
      console.log('Creando sesión de pago en Shopify:', {
        lineItems,
        customerId
      });

      // 1. Obtener información del cliente
      const customerResponse = await axios.get(
        `${this.baseUrl}/customers/${customerId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const customer = customerResponse.data.customer;

      // 2. Crear una draft order
      const draftOrderResponse = await axios.post(
        `${this.baseUrl}/draft_orders.json`,
        {
          draft_order: {
            line_items: lineItems.map(item => ({
              variant_id: item.variantId.includes('gid://') 
                ? item.variantId.split('/').pop() 
                : item.variantId,
              quantity: item.quantity
            })),
            customer: {
              id: customerId
            },
            email: customer.email,
            send_receipt: true
          }
        },
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const draftOrder = draftOrderResponse.data.draft_order;
      console.log('Draft order creada:', draftOrder);

      return {
        paymentUrl: draftOrder.invoice_url,
        draftOrderId: draftOrder.id.toString()
      };
    } catch (error) {
      console.error('Error al crear sesión de pago:', error);
      throw error;
    }
  }
} 