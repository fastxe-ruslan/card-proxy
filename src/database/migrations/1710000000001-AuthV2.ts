import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthV21710000000001 implements MigrationInterface {
  name = 'AuthV21710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.identities`);
    await queryRunner.query(`ALTER TABLE card_proxy.users
      DROP COLUMN IF EXISTS password_hash,
      DROP COLUMN IF EXISTS is_email_verified,
      DROP COLUMN IF EXISTS name`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'card_proxy'
            AND table_name   = 'users'
            AND column_name  = 'status'
        ) THEN
          ALTER TABLE card_proxy.users
            ADD COLUMN status varchar NOT NULL DEFAULT 'unverified';
        END IF;
      END$$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.auth_identities (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           UUID NOT NULL REFERENCES card_proxy.users(id) ON DELETE CASCADE,
        provider          VARCHAR(50) NOT NULL,
        provider_user_id  VARCHAR(255) NOT NULL,
        password_hash     VARCHAR(255),
        email_verified    BOOLEAN NOT NULL DEFAULT false,
        metadata_json     JSONB,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (provider, provider_user_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id ON card_proxy.auth_identities(user_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES card_proxy.users(id) ON DELETE CASCADE,
        token_hash  VARCHAR(255) NOT NULL UNIQUE,
        family_id   UUID NOT NULL,
        ip          VARCHAR(45),
        user_agent  TEXT,
        expires_at  TIMESTAMPTZ NOT NULL,
        revoked_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON card_proxy.refresh_tokens(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON card_proxy.refresh_tokens(family_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.email_verifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES card_proxy.users(id) ON DELETE CASCADE,
        token_hash  VARCHAR(255) NOT NULL UNIQUE,
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'card_proxy'
            AND table_name   = 'audit_logs'
            AND column_name  = 'actor_type'
        ) THEN
          ALTER TABLE card_proxy.audit_logs
            ADD COLUMN actor_type  VARCHAR NULL,
            ADD COLUMN entity_type VARCHAR NULL,
            ADD COLUMN entity_id   VARCHAR NULL;
          ALTER TABLE card_proxy.audit_logs
            ALTER COLUMN target DROP NOT NULL;
        END IF;
      END$$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS card_proxy.email_verifications`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.auth_identities`);
    await queryRunner.query(`ALTER TABLE card_proxy.users
      DROP COLUMN IF EXISTS status`);
    await queryRunner.query(`ALTER TABLE card_proxy.audit_logs
      DROP COLUMN IF EXISTS actor_type,
      DROP COLUMN IF EXISTS entity_type,
      DROP COLUMN IF EXISTS entity_id`);
  }
}
