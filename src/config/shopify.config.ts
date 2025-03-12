import { ConfigService } from '@nestjs/config';
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

export const createShopifyClient = (configService: ConfigService) => {
  const shopify = shopifyApi({
    apiKey: configService.get<string>('SHOPIFY_API_KEY'),
    apiSecretKey: configService.get<string>('SHOPIFY_API_SECRET'),
    scopes: ['read_products', 'write_customers', 'read_customers'],
    hostName: configService.get<string>('SHOPIFY_SHOP_NAME'),
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: false,
  });

  return shopify;
}; 