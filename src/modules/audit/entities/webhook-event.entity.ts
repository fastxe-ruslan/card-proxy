import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'webhook_events' })
export class WebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider', default: 'wasabi' })
  provider: string;

  @Column({ name: 'event_id', unique: true })
  eventId: string;

  @Column({ default: 'received' })
  status: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
