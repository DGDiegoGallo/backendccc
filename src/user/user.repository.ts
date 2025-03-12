// src/user/repositories/user.repository.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from 'src/roles.enum';
import { Orders } from 'src/order/entities/order.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Orders)
    private ordersRepository: Repository<Orders>
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { email, name, password, phone, province, city, address, zipCode, shopifyCustomerId } = createUserDto;

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('El email ya está registrado.');
    }

    if (phone && isNaN(parseInt(phone))) {
      throw new BadRequestException('El número de teléfono no es válido.');
    }

    if (createUserDto.password !== createUserDto.passwordConfirmation) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }

    // Generar el hash de la contraseña
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      province,
      city,
      address,
      zipCode,
      phone: phone || '',
      role: Role.User,
      shopifyCustomerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.userRepository.save(user);
  }


  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find({
      where: { deletedAt: null },
      relations: ['orders'], // Cargar órdenes
    });

    if (users.length === 0) {
      throw new NotFoundException('No se encontraron usuarios.');
    }

    return users;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['orders'], // Cargar órdenes
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['orders'], // Cargar órdenes
    });
  }

  async updateUser(id: string, updateUserDto: Partial<CreateUserDto>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({ where: { email: updateUserDto.email } });
      if (existingUser) {
        throw new BadRequestException('El nuevo email ya está registrado.');
      }
    }

    Object.assign(user, updateUserDto);
    user.updatedAt = new Date();

    return await this.userRepository.save(user);
  }

  async softDelete(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('User not found');
    }

    user.deletedAt = new Date();
    return await this.userRepository.save(user);
  }

  async restore(id: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id }, withDeleted: true });

    if (!user) {
      throw new NotFoundException(`El usuario con ID ${id} no existe o no está eliminado.`);
    }

    if (!user.deletedAt) {
      throw new BadRequestException(`El usuario con ID ${id} no está eliminado.`);
    }

    user.deletedAt = null;
    await this.userRepository.save(user);

    return {
      message: 'Usuario restaurado con éxito.',
      user,
    };
  }

  async save(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }

  async getUserByShopifyId(shopifyCustomerId: string): Promise<User | undefined> {
    return this.userRepository.findOne({
      where: { shopifyCustomerId },
      relations: ['orders'],
    });
  }
}
