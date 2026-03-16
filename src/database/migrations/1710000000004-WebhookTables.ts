import { MigrationInterface, QueryRunner } from 'typeorm';

export class WebhookTablesMigration1710000000004 implements MigrationInterface {
  name = 'WebhookTablesMigration1710000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE card_proxy.wasabi_webhooks (
        id               UUID         NOT NULL DEFAULT gen_random_uuid(),
        request_id       VARCHAR(255) NOT NULL,
        category         VARCHAR(100) NOT NULL,
        signature        TEXT,
        signature_valid  BOOLEAN      NOT NULL DEFAULT false,
        payload_json     JSONB        NOT NULL,
        headers_json     JSONB,
        status           VARCHAR(50)  NOT NULL DEFAULT 'received',
        error_message    TEXT,
        processed_at     TIMESTAMPTZ,
        created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_wasabi_webhooks PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_wasabi_webhooks_request_id ON card_proxy.wasabi_webhooks (request_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_wasabi_webhooks_status_created ON card_proxy.wasabi_webhooks (status, created_at);`,
    );

    await queryRunner.query(`
      CREATE TABLE card_proxy.idempotency_keys (
        id             UUID         NOT NULL DEFAULT gen_random_uuid(),
        key            VARCHAR(255) NOT NULL,
        scope          VARCHAR(100) NOT NULL,
        response_hash  VARCHAR(255),
        expires_at     TIMESTAMPTZ  NOT NULL,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_idempotency_keys PRIMARY KEY (id),
        CONSTRAINT uq_idempotency_key_scope UNIQUE (key, scope)
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS card_proxy.idempotency_keys;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.wasabi_webhooks;`);
  }
}
