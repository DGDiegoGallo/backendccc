// src/user/controllers/user.controller.ts
import { Controller, Post, Body, Get, Param, Delete, Patch, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../roles.enum';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }
  
  @Get(':email')
  findOneBy(@Body('email') email: string) {
    return this.userService.getUserByEmail(email);
  }
 

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

// Borrado lógico de usuario
@Delete('soft-delete')
softDelete(@Body() body: { id: string }) {
  return this.userService.softDelete(body.id);
}

// Restaurar un usuario eliminado lógicamente
@Patch('restore')
restore(@Body('id') id: string) {
  return this.userService.restore(id);
}

@Get('shopify/customers')
@ApiOperation({ summary: 'Obtener todos los clientes de Shopify' })
@ApiQuery({ name: 'page', required: false, description: 'Número de página (opcional)', type: Number })
@ApiQuery({ name: 'limit', required: false, description: 'Cantidad de registros por página (opcional)', type: Number })
getShopifyCustomers(
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  const pageNumber = page ? parseInt(page) : undefined;
  const limitNumber = limit ? parseInt(limit) : undefined;
  return this.userService.getShopifyCustomers(pageNumber, limitNumber);
}

@Get('shopify/search')
@ApiOperation({ summary: 'Buscar clientes en Shopify' })
@ApiQuery({ name: 'query', required: true, description: 'Término de búsqueda', type: String })
searchShopifyCustomers(@Query('query') query: string) {
  return this.userService.searchShopifyCustomers(query);
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Post('sync/:id')
async syncUserWithShopify(@Param('id') id: string) {
  return this.userService.syncUserWithShopify(id);
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Post('sync-all')
async syncAllUsersWithShopify() {
  await this.userService.syncAllUsersWithShopify();
  return { message: 'Sincronización de usuarios iniciada' };
}

}

 
