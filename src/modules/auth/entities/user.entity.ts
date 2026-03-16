import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthIdentityEntity } from './auth-identity.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { SubscriptionEntity } from '../../subscriptions/entities/subscription.entity';

export enum UserStatus {
  Active = 'active',
  Unverified = 'unverified',
  Suspended = 'suspended',
  Deleted = 'deleted',
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: UserStatus.Unverified })
  status: UserStatus;

  @Column({ default: 'user' })
  role: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AuthIdentityEntity, (identity) => identity.user)
  identities: AuthIdentityEntity[];

  @OneToMany(() => RefreshTokenEntity, (token) => token.user)
  refreshTokens: RefreshTokenEntity[];

  @OneToMany(() => SubscriptionEntity, (subscription) => subscription.user)
  subscriptions: SubscriptionEntity[];
}
