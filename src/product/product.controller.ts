import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Post('stock')
  async checkStock(@Body() body: { variantIds: string[] }) {
    return this.productService.checkStock(body.variantIds);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync-stock')
  async syncStock(@Body() body: { variantId: string }) {
    return this.productService.syncStockWithShopify(body.variantId);
  }
}
