import {
  MaxLength,
  MinLength,
  Validate,
  Matches,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Orders } from 'src/order/entities/order.entity';
import { Role } from 'src/roles.enum';
import { MatchPassword } from 'src/utils/decorators/matchPassword.decorator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(15)
  password: string;

  @IsNotEmpty()
  @Validate(MatchPassword, ['password'])
  passwordConfirmation: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  acceptsMarketing?: boolean;

  @IsOptional()
  @IsString()
  shopifyCustomerId?: string;

  @IsOptional()
  @IsEnum(Role)
  role: Role = Role.User;

  @IsOptional()
  orders?: Orders[] = [];
}
