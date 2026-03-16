import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { SubscriptionPlanEntity } from './subscription-plan.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@Entity({ name: 'subscriptions' })
@Index(['userId', 'createdAt'])
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.subscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => SubscriptionPlanEntity, (plan) => plan.subscriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlanEntity;

  @Column({ type: 'uuid', name: 'plan_id' })
  planId: string;

  @Column({ type: 'varchar', length: 50, default: SubscriptionStatus.Active })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz', name: 'started_at', default: () => 'NOW()' })
  startedAt: Date;

  @Column({ type: 'timestamptz', name: 'ends_at', nullable: true })
  endsAt: Date | null;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', name: 'cancel_reason', nullable: true })
  cancelReason: string | null;

  @Column({ type: 'jsonb', name: 'metadata_json', nullable: true })
  metadataJson: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
