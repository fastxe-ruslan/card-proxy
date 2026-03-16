import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CardEntity } from './card.entity';
import {
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../enums/transaction.enums';

@Entity({ name: 'card_transactions' })
@Index('idx_card_transactions_wasabi_txn_id', ['wasabiTxnId'], { unique: true })
@Index('idx_card_transactions_card_occurred', ['cardId', 'occurredAt'])
export class CardTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id', type: 'uuid' })
  cardId: string;

  @ManyToOne(() => CardEntity, (card) => card.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'card_id' })
  card: CardEntity;

  @Column({ name: 'wasabi_txn_id', unique: true })
  wasabiTxnId: string;

  @Column({ type: 'varchar', name: 'merchant_name', nullable: true })
  merchantName: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  amount: string;

  @Column({ length: 3 })
  currency: string;

  @Column({ default: TransactionDirection.Debit })
  direction: TransactionDirection;

  @Column({ default: TransactionStatus.Pending })
  status: TransactionStatus;

  @Column({ name: 'transaction_type', default: TransactionType.Auth })
  transactionType: TransactionType;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
