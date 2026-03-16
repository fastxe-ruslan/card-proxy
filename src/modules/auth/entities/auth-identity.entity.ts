import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum AuthProvider {
  Email = 'email',
  Google = 'google',
  Apple = 'apple',
}

@Entity({ name: 'auth_identities' })
@Unique(['provider', 'providerUserId'])
export class AuthIdentityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.identities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  provider: AuthProvider;

  @Column({ name: 'provider_user_id' })
  providerUserId: string;

  @Column({ type: 'varchar', name: 'password_hash', nullable: true })
  passwordHash: string | null;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'metadata_json', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
