import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriptionEntity } from './subscription.entity';
import { SubscriptionPlanEntity } from './subscription-plan.entity';
import { SubscriptionEventType } from '../enums/subscription-event-type.enum';

@Entity({ name: 'subscription_events' })
@Index(['subscriptionId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class SubscriptionEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription: SubscriptionEntity;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType: SubscriptionEventType;

  @ManyToOne(() => SubscriptionPlanEntity, { nullable: true })
  @JoinColumn({ name: 'from_plan_id' })
  fromPlan: SubscriptionPlanEntity | null;

  @Column({ type: 'uuid', name: 'from_plan_id', nullable: true })
  fromPlanId: string | null;

  @ManyToOne(() => SubscriptionPlanEntity, { nullable: true })
  @JoinColumn({ name: 'to_plan_id' })
  toPlan: SubscriptionPlanEntity | null;

  @Column({ type: 'uuid', name: 'to_plan_id', nullable: true })
  toPlanId: string | null;

  @Column({ type: 'jsonb', name: 'metadata_json', nullable: true })
  metadataJson: Record<string, unknown> | null;

  @Column({ type: 'uuid', name: 'correlation_id' })
  correlationId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
