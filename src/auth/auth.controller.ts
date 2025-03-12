import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  //-----REGISTRO--FIREBASE------
  @Post('register-firebase')
  async registerWithFirebase(@Body() user: Partial<CreateUserDto>) {
    return this.authService.registerWithFirebase(user);
  }
  

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  //---------LOGIN----FIREBASE-------
  @Post('login-firebase')
  async loginWithFirebaseController(@Body() body:{email:string}){
    return this.authService.loginFIrebase(body.email)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    try {
      console.log('User from request:', req.user);
      if (!req.user || !req.user.id) {
        throw new NotFoundException('Usuario no encontrado en el token');
      }
      
      // Usar directamente el servicio de usuarios
      const user = await this.userService.findOne(req.user.id);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Devolver solo la información necesaria
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        shopifyCustomerId: user.shopifyCustomerId
      };
    } catch (error) {
      console.error('Error en getProfile:', error);
      throw error;
    }
  }

  @Post()
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
