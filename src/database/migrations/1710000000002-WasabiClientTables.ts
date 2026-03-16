import { MigrationInterface, QueryRunner } from 'typeorm';

export class WasabiClientTables1710000000002 implements MigrationInterface {
  name = 'WasabiClientTables1710000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.wasabi_credentials (
        id          UUID        NOT NULL DEFAULT gen_random_uuid(),
        program_id  VARCHAR     NOT NULL,
        api_key     VARCHAR     NOT NULL,
        app_id      VARCHAR     NOT NULL,
        kid         VARCHAR,
        key_ref     TEXT        NOT NULL,
        is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_wasabi_credentials PRIMARY KEY (id),
        CONSTRAINT uq_wasabi_credentials_program_id UNIQUE (program_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_proxy.wasabi_request_logs (
        id                UUID        NOT NULL DEFAULT gen_random_uuid(),
        operation         VARCHAR     NOT NULL,
        endpoint          VARCHAR     NOT NULL,
        method            VARCHAR     NOT NULL DEFAULT 'POST',
        status_code       INT,
        duration_ms       INT,
        correlation_id    VARCHAR,
        request_payload   JSONB,
        response_payload  JSONB,
        error_code        VARCHAR,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_wasabi_request_logs PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_wasabi_request_logs_correlation_id
        ON card_proxy.wasabi_request_logs (correlation_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_wasabi_request_logs_operation
        ON card_proxy.wasabi_request_logs (operation);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_wasabi_request_logs_created_at
        ON card_proxy.wasabi_request_logs (created_at DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS card_proxy.wasabi_request_logs;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS card_proxy.wasabi_credentials;`,
    );
  }
}
