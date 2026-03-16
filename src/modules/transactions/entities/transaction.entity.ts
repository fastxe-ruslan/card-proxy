import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'transactions' })
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_transaction_id', unique: true })
  externalTransactionId: string;

  @Column({ name: 'external_card_id' })
  externalCardId: string;

  @Column({ type: 'numeric' })
  amount: string;

  @Column({ type: 'varchar', nullable: true })
  currency: string | null;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'varchar', name: 'description', nullable: true })
  description: string | null;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
