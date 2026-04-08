import { MigrationInterface, QueryRunner } from 'typeorm';

/** Outgoing Wasabi credentials moved to environment variables. */
export class DropWasabiCredentials1710000000008 implements MigrationInterface {
  name = 'DropWasabiCredentials1710000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS card_proxy.wasabi_credentials;`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
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
  }
}
