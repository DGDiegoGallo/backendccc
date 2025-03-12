import {
  Column,
  Entity,
  JoinColumn,
  DeleteDateColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Orders } from 'src/order/entities/order.entity';
import { ApiOperation, ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/roles.enum';
import { appendFile } from 'fs';

@Entity({ name: 'users' })
export class User {
   
  @ApiProperty({ description: 'El ID del usuario', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'El ID del cliente en Shopify', example: '1234567890' })
  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  shopifyCustomerId: string;

  @ApiProperty({ description: 'El nombre del usuario', example: 'John Doe' })
  @Column({ type: 'varchar', length: 50, nullable: false })
  name: string;

  @ApiProperty({ description: 'El apellido del usuario', example: 'Doe' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  lastName: string;

  @ApiProperty({
    description: 'El correo electrónico del usuario',
    example: 'john.doe@example.com',
  })
  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  email: string;

  @ApiProperty({
    description: 'La contraseña del usuario',
    example: 'strongpassword123',
  })
  @Column({ type: 'varchar', length: 60, nullable: false })
  password: string;

  @ApiProperty({
    description: 'El número de teléfono del usuario',
    example: 1234567890,
  })
  @Column({ type: 'varchar', length: 15, nullable: false })
  phone: string;

  @ApiProperty({
    description: 'Departamento(provincia) donde se encuentra ',
    example: 'Antioquia, Córdoba',
  })
  @Column({ type: 'varchar', nullable: true })
  province: string;

  @ApiProperty({
    description: 'La ciudad del usuario',
    example: 'Buenos Aires',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string;

  @ApiProperty({
    description: 'direccion del usuario para los envios',
    example: 'calle falsa #123',
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  address: string;

  @ApiProperty({description:"codigo postal",example:'b1645'})
  @Column({type:'varchar',length:10,nullable:true})
  zipCode:string;

  @ApiProperty({
    description: 'Estado/Provincia por defecto',
    example: 'Antioquia',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  defaultProvince: string;

  @ApiProperty({
    description: 'Notas sobre el cliente',
    example: 'Cliente VIP',
  })
  @Column({ type: 'text', nullable: true })
  note: string;

  @ApiProperty({
    description: 'Indica si el usuario acepta marketing',
    example: true,
  })
  @Column({ type: 'boolean', default: false })
  acceptsMarketing: boolean;

  @ApiProperty({
    description: 'Indica si el usuario es administrador',
    example: false,
  })
  @Column({ type: 'enum', enum: Role, default: Role.Guest })
  role: Role;

  @ApiProperty({
    description: 'fecha de registro del usuario',
    example: '2023-01-02T00:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'fecha de últimaactualización del usuario',
    example: '2023-01-02T00:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({
    type: () => Orders,
    isArray: true,
    description: 'Las órdenes del usuario',
  })
  @OneToMany(() => Orders, (order) => order.user, { cascade: true })
  orders: Orders[];

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null; // Fecha del borrado lógico
}
