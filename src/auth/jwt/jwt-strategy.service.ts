import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { Role } from 'src/roles.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(
        private configService: ConfigService,
        private userService: UserService
    ){
        super({
            secretOrKeyProvider: jwksRsa.expressJwtSecret({
              cache: true,
              rateLimit: true,
              jwksRequestsPerMinute: 5,
              jwksUri: `https://${configService.get('AUTH0_DOMAIN')}/.well-known/jwks.json`,
            }),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            audience: configService.get('AUTH0_CLIENT_ID'),
            issuer: `https://${configService.get('AUTH0_DOMAIN')}/`,
            algorithms: ['RS256'],
          });
    }

    async validate(payload: Partial<User>) {
        if (!payload.name || !payload.email || !payload.phone || !payload.password) {
          throw new Error('Payload Incompleto');
        }
      
        let user = await this.userService.getUserByEmail(payload.email);
      
        // Si el usuario no existe, crea uno
        if (!user) {
          const newUser = await this.userService.create({
            email: payload.email,
            name: payload.name,
            password: payload.password,
            passwordConfirmation:payload.password,
            phone: payload.phone.toString(),
            role: payload.role || Role.User, 
            orders: [], 
          });
          return { userId: newUser.id, email: newUser.email };
        }
      
        return user; // Retorna el usuario existente
      }
      
}