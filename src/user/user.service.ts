import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { ShopifyService } from '../config/shopify.service';
import { Role } from 'src/roles.enum';
import { firestore } from 'firebase-admin';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private shopifyService: ShopifyService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Primero creamos el cliente en Shopify
      const shopifyCustomer = await this.shopifyService.createCustomer({
        email: createUserDto.email,
        firstName: createUserDto.name,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        note: createUserDto.note,
        acceptsMarketing: createUserDto.acceptsMarketing,
        addresses: createUserDto.address ? [{
          address1: createUserDto.address,
          city: createUserDto.city,
          province: createUserDto.province,
          zip: createUserDto.zipCode
        }] : []
      });

      // Luego creamos el usuario en nuestra base de datos con el ID de Shopify
      const user = await this.userRepository.createUser({
        ...createUserDto,
        shopifyCustomerId: shopifyCustomer.id.toString()
      });

      return user;
    } catch (error) {
      console.error('Error en el proceso de creación de usuario:', error);
      
      if (error.response?.data?.errors) {
        // Si hay errores específicos de Shopify
        throw new BadRequestException(error.response.data.errors);
      }
      
      throw new BadRequestException('Error al crear el usuario. Por favor, intente nuevamente.');
    }
  }

  async registerUserInShopify(user: Partial<CreateUserDto>): Promise<string> {
    try {
      const shopifyCustomer = await this.shopifyService.createCustomer({
        email: user.email,
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ').slice(1).join(' ') || undefined,
        phone: user.phone || undefined,
        note: 'Registro desde Firebase',
        acceptsMarketing: false,
        addresses: user.city || user.province || user.zipCode
          ? [{
              address1: '',
              city: user.city || '',
              province: user.province || '',
              zip: user.zipCode || '',
              country: 'Colombia'
            }]
          : []
      });
  
      return shopifyCustomer.id;
    } catch (error) {
      console.error('Error registrando usuario en Shopify:', error);
      throw new Error('No se pudo registrar el usuario en Shopify');
    }
  }

  async createUserWithFirebase(user: CreateUserDto): Promise<User> {
    // Crear el usuario en la base de datos
    const newUser = await this.userRepository.createUser(user);
    
    // Guardar en la base de datos y esperar el resultado
    return  this.userRepository.save(newUser);
  }

  
  async findAll(): Promise<User[]> {
    const users = await this.userRepository.findAll();
    
    // Sincronizar datos con Shopify para cada usuario
    for (const user of users) {
      if (user.shopifyCustomerId) {
        try {
          const shopifyCustomer = await this.shopifyService.getCustomerById(user.shopifyCustomerId);
          
          // Actualizar datos locales con datos de Shopify
          user.name = shopifyCustomer.first_name;
          user.lastName = shopifyCustomer.last_name;
          user.email = shopifyCustomer.email;
          user.phone = shopifyCustomer.phone;
          user.note = shopifyCustomer.note;
          user.acceptsMarketing = shopifyCustomer.accepts_marketing;

          if (shopifyCustomer.addresses && shopifyCustomer.addresses.length > 0) {
            const defaultAddress = shopifyCustomer.addresses[0];
            user.address = defaultAddress.address1;
            user.city = defaultAddress.city;
            user.province = defaultAddress.province;
            user.zipCode = defaultAddress.zip;
          }

          await this.userRepository.save(user);
        } catch (error) {
          console.error(`Error syncing user ${user.id} with Shopify:`, error);
        }
      }
    }

    return users;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne(id);
    
    if (user && user.shopifyCustomerId) {
      try {
        const shopifyCustomer = await this.shopifyService.getCustomerById(user.shopifyCustomerId);
        
        // Actualizar datos locales con datos de Shopify
        user.name = shopifyCustomer.first_name;
        user.lastName = shopifyCustomer.last_name;
        user.email = shopifyCustomer.email;
        user.phone = shopifyCustomer.phone;
        user.note = shopifyCustomer.note;
        user.acceptsMarketing = shopifyCustomer.accepts_marketing;

        if (shopifyCustomer.addresses && shopifyCustomer.addresses.length > 0) {
          const defaultAddress = shopifyCustomer.addresses[0];
          user.address = defaultAddress.address1;
          user.city = defaultAddress.city;
          user.province = defaultAddress.province;
          user.zipCode = defaultAddress.zip;
        }

        await this.userRepository.save(user);
      } catch (error) {
        console.error(`Error syncing user ${id} with Shopify:`, error);
      }
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.getUserByEmail(email) || null;
  }

  async softDelete(id: string): Promise<any> {
    const deletedUser = await this.userRepository.softDelete(id);
    return {
      message: 'User soft deleted successfully',
      user: deletedUser,
    };
  }

  async restore(id: string): Promise<any> {
    const restoredUser = await this.userRepository.restore(id);
    return {
      message: 'User restored successfully',
      user: restoredUser,
    };
  }

  async getShopifyCustomers(page?: number, limit?: number) {
    try {
      // Si no se proporciona paginación, obtener todos los clientes
      const shopifyData = await this.shopifyService.getAllCustomers(page, limit);
      
      // Convertir los datos de Shopify al formato deseado sin crear usuarios locales
      const formattedCustomers = shopifyData.customers.map((customer) => ({
        shopifyId: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone || '',
        province: customer.addresses?.[0]?.province || '',
        city: customer.addresses?.[0]?.city || '',
        address: customer.addresses?.[0]?.address1 || '',
        zipCode: customer.addresses?.[0]?.zip || '',
        note: customer.note || '',
        acceptsMarketing: customer.accepts_marketing || false,
        addresses: customer.addresses || [],
        ordersCount: customer.orders_count,
        totalSpent: customer.total_spent,
        lastOrderId: customer.last_order_id
      }));

      // Si no se proporcionó paginación, devolver solo los clientes
      if (!page && !limit) {
        return formattedCustomers;
      }

      // Si se proporcionó paginación, devolver estructura con metadata
      return {
        customers: formattedCustomers,
        pagination: {
          currentPage: page || 1,
          limit: limit || 50,
          total: shopifyData.pagination.total
        }
      };
    } catch (error) {
      console.error('Error getting Shopify customers:', error);
      throw error;
    }
  }

  async searchShopifyCustomers(query: string) {
    try {
      const shopifyCustomers = await this.shopifyService.searchCustomers(query);
      
      // Convertir los datos de Shopify al formato deseado sin crear usuarios locales
      return shopifyCustomers.map((customer) => ({
        shopifyId: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone || '',
        province: customer.addresses?.[0]?.province || '',
        city: customer.addresses?.[0]?.city || '',
        address: customer.addresses?.[0]?.address1 || '',
        zipCode: customer.addresses?.[0]?.zip || '',
        note: customer.note || '',
        acceptsMarketing: customer.accepts_marketing || false,
        addresses: customer.addresses || [],
        ordersCount: customer.orders_count,
        totalSpent: customer.total_spent,
        lastOrderId: customer.last_order_id
      }));
    } catch (error) {
      console.error('Error searching Shopify customers:', error);
      throw error;
    }
  }

  async syncUserWithShopify(userId: string): Promise<User> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // No sincronizar si es el usuario admin
    if (user.email === 'admin@mail.com' || user.role === Role.Admin) {
      return user;
    }

    try {
      // Primero buscar si el usuario ya existe en Shopify por email
      const shopifyCustomers = await this.shopifyService.searchCustomers(`email:${user.email}`);
      
      let shopifyCustomerId;
      
      if (shopifyCustomers && shopifyCustomers.length > 0) {
        // Si el usuario existe en Shopify, usar ese ID
        shopifyCustomerId = shopifyCustomers[0].id.toString();
      } else {
        // Si no existe, crear nuevo cliente en Shopify
        const shopifyCustomer = await this.shopifyService.createCustomer({
          email: user.email,
          firstName: user.name,
          lastName: user.lastName,
          phone: user.phone,
          note: user.note,
          acceptsMarketing: user.acceptsMarketing,
          addresses: user.address ? [{
            address1: user.address,
            city: user.city,
            province: user.province,
            zip: user.zipCode
          }] : []
        });
        shopifyCustomerId = shopifyCustomer.id.toString();
      }

      // Actualizar el usuario con el ID de Shopify
      user.shopifyCustomerId = shopifyCustomerId;
      await this.userRepository.save(user);

      return user;
    } catch (error) {
      console.error('Error sincronizando usuario con Shopify:', error);
      if (error.response?.data?.errors) {
        throw new BadRequestException(error.response.data.errors);
      }
      throw new BadRequestException('Error al sincronizar con Shopify. Por favor, intente nuevamente.');
    }
  }

  async syncAllUsersWithShopify(): Promise<void> {
    const users = await this.userRepository.findAll();
    // Filtrar usuarios que no tienen shopifyCustomerId y no son admin
    const usersWithoutShopifyId = users.filter(user => 
      !user.shopifyCustomerId && 
      user.email !== 'admin@mail.com' && 
      user.role !== Role.Admin
    );

    for (const user of usersWithoutShopifyId) {
      try {
        await this.syncUserWithShopify(user.id);
        console.log(`Usuario ${user.email} sincronizado con Shopify exitosamente`);
      } catch (error) {
        console.error(`Error sincronizando usuario ${user.email}:`, error);
        // Continuamos con el siguiente usuario incluso si hay error
        continue;
      }
    }
  }
}
