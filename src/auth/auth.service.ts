import { Injectable, UnauthorizedException, NotFoundException,BadRequestException, BadGatewayException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { Role } from 'src/roles.enum';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) {}

  async register(createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.getUserByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    console.log('Usuario encontrado:', { id: user.id, email: user.email, role: user.role });

    const payload = { 
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = this.jwtService.sign(payload);
    console.log('Token generado con payload:', payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        shopifyCustomerId: user.shopifyCustomerId
      }
    };
  }


  //--------REGISTRO--FIREBASE----
  async registerWithFirebase(user: Partial<CreateUserDto>) {
    try {
      if (!user.email || !user.name) {
        throw new BadRequestException('Nombre y email son requeridos');
      }

      const existingUser = await this.userService.getUserByEmail(user.email);
      if (existingUser) {
        throw new BadRequestException('El usuario ya está registrado');
      }

      // Registrar usuario en Shopify
      const shopifyCustomerId = await this.userService.registerUserInShopify(user);

      // Crear usuario en la base de datos
      const newUser = await this.userService.createUserWithFirebase({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: '',
        province: '',
        city: '',
        zipCode: '',
        role: Role.User,
        shopifyCustomerId,
        passwordConfirmation: ''
      });

      return newUser;
    } catch (error) {
      console.error('Error en registerWithFirebase:', error);
      throw new BadRequestException('Error registrando usuario con Firebase y Shopify');
    }
  }

  //---LOGIN---FEBASE---
  
    async loginFIrebase(email:string):Promise<{user:Partial<User>; message:string; accessToken:string}>{
      try {
        if(!email){
          throw new BadRequestException('El email es requerido');
        }
        const user = await this.userService.getUserByEmail(email);
        if(!user){
          throw new UnauthorizedException('el Usuario no se encuentrra regitrado');
        }
  
        const payload = {
          email:user.email,
          id:user.id,
          role:Role.User
        };
  
        const accessToken = this.jwtService.sign(payload)
  
        return {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          
          },
          message: 'Google user logged successfully',
          accessToken,
        };
      } catch (error) {
        console.error('Error al iniciar sesion con firebase',error)
      }
    }
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.getUserByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth record';
  }

  findAll() {
    return 'This action returns all auth records';
  }

  async findOne(id: string) {
    try {
      console.log('Buscando usuario con ID:', id);
      if (!id || typeof id !== 'string' || id === 'me') {
        throw new NotFoundException('ID de usuario no válido');
      }
      const user = await this.userService.findOne(id);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      return user;
    } catch (error) {
      console.error('Error en findOne:', error);
      throw error;
    }
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates auth record #${id}`;
  }

  remove(id: number) {
    return `This action removes auth record #${id}`;
  }
}
