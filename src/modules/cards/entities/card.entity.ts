import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { CardholderEntity } from './cardholder.entity';
import { CardTransactionEntity } from './card-transaction.entity';
import { CardStatus } from '../enums/card-status.enum';
import { CardType } from '../enums/card-type.enum';

@Entity({ name: 'cards' })
@Index('idx_cards_user_id', ['userId'])
@Index('idx_cards_holder_id', ['holderId'])
@Index('idx_cards_wasabi_card_no', ['wasabiCardNo'], {
  unique: true,
  where: '"wasabi_card_no" IS NOT NULL',
})
export class CardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'holder_id', type: 'uuid' })
  holderId: string;

  @ManyToOne(() => CardholderEntity, (holder) => holder.cards, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'holder_id' })
  holder: CardholderEntity;

  @Column({ type: 'varchar', name: 'wasabi_card_no', nullable: true })
  wasabiCardNo: string | null;

  @Column({ type: 'varchar', name: 'wasabi_order_no', nullable: true })
  wasabiOrderNo: string | null;

  @Column({ name: 'merchant_order_no' })
  merchantOrderNo: string;

  @Column({ default: CardType.Virtual })
  type: CardType;

  @Column({ default: CardStatus.Pending })
  status: CardStatus;

  @Column({ name: 'program_id' })
  programId: string;

  @OneToMany(() => CardTransactionEntity, (tx) => tx.card)
  transactions: CardTransactionEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
