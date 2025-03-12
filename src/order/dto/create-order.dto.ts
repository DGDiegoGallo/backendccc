import { ArrayMinSize, IsUUID, IsNotEmpty } from 'class-validator';
import { Product } from 'src/product/entities/product.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  
  @ApiProperty({
    description: 'ID del usuario que realiza el pedido',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ 
    description: 'Lista de productos en el pedido, debe contener al menos un producto',
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Producto 1',
        description: 'Descripción del producto 1',
        price: 19.99,
        stock: 100,
        imgUrl: 'http://example.com/producto1.jpg',
      },
    ],
  })
  @IsNotEmpty()
  @ArrayMinSize(1)
  products: Partial<Product[]>;
}
