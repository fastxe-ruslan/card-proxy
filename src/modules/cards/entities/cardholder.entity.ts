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
import { CardholderStatus } from '../enums/holder-status.enum';
import { HolderAccountType, HolderVersion } from '../enums/card-type.enum';
import { CardEntity } from './card.entity';

@Entity({ name: 'cardholders' })
@Index('idx_cardholders_user_id', ['userId'])
@Index('idx_cardholders_wasabi_holder_id', ['wasabiHolderId'], {
  unique: true,
  where: '"wasabi_holder_id" IS NOT NULL',
})
export class CardholderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar', name: 'wasabi_holder_id', nullable: true })
  wasabiHolderId: string | null;

  @Column({ type: 'varchar', name: 'wasabi_merchant_order_no', nullable: true })
  wasabiMerchantOrderNo: string | null;

  @Column({ default: CardholderStatus.WaitAudit })
  status: CardholderStatus;

  @Column({ name: 'status_reason', type: 'text', nullable: true })
  statusReason: string | null;

  @Column({ name: 'account_type', default: HolderAccountType.Personal })
  accountType: HolderAccountType;

  @Column({ default: HolderVersion.V1 })
  version: HolderVersion;

  @Column({ name: 'program_id' })
  programId: string;

  @OneToMany(() => CardEntity, (card) => card.holder)
  cards: CardEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
