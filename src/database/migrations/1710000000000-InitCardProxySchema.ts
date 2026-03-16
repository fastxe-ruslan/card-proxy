import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCardProxySchema1710000000000 implements MigrationInterface {
  name = 'InitCardProxySchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS card_proxy`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar NOT NULL UNIQUE,
        password_hash varchar NULL,
        is_email_verified boolean NOT NULL DEFAULT false,
        name varchar NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.identities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES card_proxy.users(id) ON DELETE CASCADE,
        provider varchar NOT NULL,
        provider_subject varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(provider, provider_subject)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES card_proxy.users(id) ON DELETE CASCADE,
        token varchar NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES card_proxy.users(id) ON DELETE CASCADE,
        plan varchar NOT NULL DEFAULT 'free',
        status varchar NOT NULL DEFAULT 'active',
        starts_at timestamptz NULL,
        ends_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.card_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        external_account_id varchar NOT NULL UNIQUE,
        currency varchar NULL,
        available_balance numeric NOT NULL DEFAULT 0,
        status varchar NOT NULL DEFAULT 'unknown',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.cards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id varchar NOT NULL,
        external_card_id varchar NOT NULL UNIQUE,
        last4 varchar NULL,
        type varchar NOT NULL DEFAULT 'virtual',
        status varchar NOT NULL DEFAULT 'unknown',
        balance_snapshot numeric NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        external_transaction_id varchar NOT NULL UNIQUE,
        external_card_id varchar NOT NULL,
        amount numeric NOT NULL,
        currency varchar NULL,
        status varchar NOT NULL DEFAULT 'pending',
        description varchar NULL,
        posted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id varchar NULL,
        action varchar NOT NULL,
        target varchar NOT NULL,
        payload jsonb NULL,
        correlation_id varchar NULL,
        ip varchar NULL,
        user_agent varchar NULL,
        status_code int NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.webhook_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider varchar NOT NULL DEFAULT 'wasabi',
        event_id varchar NOT NULL UNIQUE,
        status varchar NOT NULL DEFAULT 'received',
        payload jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.webhook_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.transactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.cards`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.card_accounts`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.subscriptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.identities`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.users`);
  }
}
