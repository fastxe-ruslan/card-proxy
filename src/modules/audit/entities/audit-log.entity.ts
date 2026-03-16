import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActorType } from '../enums/actor-type.enum';


@Entity({ name: 'audit_logs' })
@Index(['actorId', 'createdAt'])
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['correlationId'])
@Index(['createdAt'])
@Index(['isSensitive', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'actor_type' })
  actorType: ActorType | string;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 50, name: 'entity_type', nullable: true })
  entityType: string | null;

  @Column({ type: 'uuid', name: 'entity_id', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', name: 'before_json', nullable: true })
  beforeJson: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'after_json', nullable: true })
  afterJson: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'metadata_json', nullable: true })
  metadataJson: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'uuid', name: 'correlation_id' })
  correlationId: string;

  @Column({ type: 'boolean', name: 'is_sensitive', default: false })
  isSensitive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
