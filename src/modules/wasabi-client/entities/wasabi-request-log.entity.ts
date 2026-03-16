import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'wasabi_request_logs' })
@Index(['correlationId'])
@Index(['operation', 'createdAt'])
@Index(['success', 'createdAt'])
@Index(['createdAt'])
export class WasabiRequestLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  operation: string;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({ type: 'varchar', length: 10, default: 'POST' })
  method: string;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ name: 'wasabi_code', type: 'varchar', length: 50, nullable: true })
  wasabiCode: string | null;

  @Column({ name: 'wasabi_msg', type: 'text', nullable: true })
  wasabiMsg: string | null;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({
    name: 'correlation_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  correlationId: string | null;

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload: Record<string, unknown> | null;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
