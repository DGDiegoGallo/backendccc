import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('shopify_orders')
export class Orders {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, user => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  customerId: string;

  @Column({ unique: true, nullable: true })
  shopifyOrderId: string;

  @Column({ unique: true })
  shopifyDraftOrderId: string;

  @Column({ nullable: true })
  orderNumber: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalPrice: number;

  @Column()
  status: string;

  @Column('jsonb', { nullable: true })
  lineItems: Array<{
    variantId: string;
    quantity: number;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
