import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductService {
  private storefrontAccessToken: string;
  private shopName: string;
  private adminAccessToken: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Product)
    private productRepository: Repository<Product>
  ) {
    this.storefrontAccessToken = this.configService.get<string>('SHOPIFY_STOREFRONT_TOKEN');
    this.shopName = this.configService.get<string>('SHOPIFY_SHOP_NAME');
    this.adminAccessToken = this.configService.get<string>('SHOPIFY_ADMIN_ACCESS_TOKEN');
  }

  async findAll() {
    try {
      const response = await fetch(`https://${this.shopName}/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken,
        },
        body: JSON.stringify({
          query: `
            {
              products(first: 250) {
                edges {
                  node {
                    id
                    title
                    description
                    handle
                    images(first: 10) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                    priceRange {
                      minVariantPrice {
                        amount
                        currencyCode
                      }
                    }
                    variants(first: 10) {
                      edges {
                        node {
                          id
                          title
                          price {
                            amount
                            currencyCode
                          }
                          availableForSale
                          quantityAvailable
                        }
                      }
                    }
                  }
                }
              }
            }
          `
        }),
      });

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      return {
        success: true,
        products: data.data.products.edges.map(({ node: product }) => ({
          id: product.id,
          title: product.title,
          description: product.description,
          handle: product.handle,
          price: product.priceRange.minVariantPrice.amount,
          currencyCode: product.priceRange.minVariantPrice.currencyCode,
          images: product.images.edges.map(({ node: image }) => ({
            url: image.url,
            altText: image.altText
          })),
          variants: product.variants.edges.map(({ node: variant }) => ({
            id: variant.id,
            title: variant.title,
            price: variant.price.amount,
            currencyCode: variant.price.currencyCode,
            availableForSale: variant.availableForSale,
            quantityAvailable: variant.quantityAvailable || 0
          }))
        }))
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async checkStock(variantIds: string[]) {
    try {
      const response = await fetch(`https://${this.shopName}/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken,
        },
        body: JSON.stringify({
          query: `
            query checkVariantsAvailability($ids: [ID!]!) {
              nodes(ids: $ids) {
                ... on ProductVariant {
                  id
                  title
                  quantityAvailable
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          `,
          variables: {
            ids: variantIds
          }
        }),
      });

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      return data.data.nodes.map(variant => ({
        id: variant.id,
        title: variant.title,
        quantityAvailable: variant.quantityAvailable,
        price: variant.price
      }));
    } catch (error) {
      console.error('Error al verificar stock en Shopify:', error);
      throw new Error('Error al obtener información de stock');
    }
  }

  async syncStockWithShopify(variantId: string) {
    try {
      // Obtener el stock actual de Shopify
      const response = await fetch(`https://${this.shopName}/admin/api/2024-01/variants/${variantId}.json`, {
        headers: {
          'X-Shopify-Access-Token': this.adminAccessToken
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información de Shopify');
      }

      const data = await response.json();
      const { inventory_quantity } = data.variant;

      // Actualizar el stock en nuestra base de datos
      const product = await this.productRepository.findOne({
        where: { shopifyVariantId: variantId }
      });

      if (product) {
        product.quantityAvailable = inventory_quantity;
        await this.productRepository.save(product);
      }

      return { success: true, stock: inventory_quantity };
    } catch (error) {
      console.error('Error al sincronizar stock:', error);
      throw new Error('Error al sincronizar stock con Shopify');
    }
  }

  async reserveStock(variantId: string, quantity: number) {
    try {
      // Verificar el stock actual en Shopify
      const stockInfo = await this.checkStock([variantId]);
      const variantStock = stockInfo[0];

      if (!variantStock) {
        throw new Error('Producto no encontrado');
      }

      if (variantStock.quantityAvailable < quantity) {
        throw new Error('Stock insuficiente');
      }

      return true;
    } catch (error) {
      console.error('Error al reservar stock:', error);
      throw error;
    }
  }

  async confirmStockReservation(variantId: string, quantity: number) {
    try {
      // No necesitamos hacer nada aquí ya que Shopify maneja el stock automáticamente
      return true;
    } catch (error) {
      console.error('Error al confirmar reserva de stock:', error);
      throw error;
    }
  }

  async releaseStockReservation(variantId: string, quantity: number) {
    try {
      // No necesitamos hacer nada aquí ya que no estamos reservando stock localmente
      return true;
    } catch (error) {
      console.error('Error al liberar reserva de stock:', error);
      throw error;
    }
  }
}
