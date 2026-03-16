import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WebhookStatus } from '../enums/webhook-status.enum';

@Entity({ name: 'wasabi_webhooks' })
@Index('idx_wasabi_webhooks_request_id', ['requestId'], { unique: true })
@Index('idx_wasabi_webhooks_status_created', ['status', 'createdAt'])
export class WasabiWebhookEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', length: 255 })
  requestId: string;

  @Column({ length: 100 })
  category: string;

  @Column({ type: 'text', nullable: true })
  signature: string | null;

  @Column({ name: 'signature_valid', default: false })
  signatureValid: boolean;

  @Column({ name: 'payload_json', type: 'jsonb' })
  payloadJson: Record<string, unknown>;

  @Column({ name: 'headers_json', type: 'jsonb', nullable: true })
  headersJson: Record<string, unknown> | null;

  @Column({ default: WebhookStatus.Received })
  status: WebhookStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
