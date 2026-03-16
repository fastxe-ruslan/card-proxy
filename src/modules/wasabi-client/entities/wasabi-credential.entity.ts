import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'wasabi_credentials' })
export class WasabiCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'program_id', unique: true })
  programId: string;

  @Column({ name: 'api_key' })
  apiKey: string;

  @Column({ name: 'app_id' })
  appId: string;

  @Column({ type: 'varchar', nullable: true })
  kid: string | null;

  @Column({ name: 'key_ref', type: 'text' })
  keyRef: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
