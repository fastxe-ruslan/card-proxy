import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BillingPeriod } from '../enums/billing-period.enum';
import { PlanFeatures } from '../interfaces/plan-features.interface';
import { SubscriptionEntity } from './subscription.entity';

@Entity({ name: 'subscription_plans' })
export class SubscriptionPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    name: 'price_amount',
    nullable: true,
  })
  priceAmount: number | null;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'price_currency',
    nullable: true,
  })
  priceCurrency: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'billing_period',
    nullable: true,
  })
  billingPeriod: BillingPeriod | null;

  @Column({ type: 'jsonb', name: 'features_json', nullable: true })
  featuresJson: PlanFeatures | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SubscriptionEntity, (s) => s.plan)
  subscriptions: SubscriptionEntity[];
}
