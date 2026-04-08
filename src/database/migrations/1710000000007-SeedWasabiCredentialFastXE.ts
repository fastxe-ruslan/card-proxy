import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Historical: seeded wasabi_credentials for tenant `fastXE`. Superseded by env-based
 * credentials; table dropped in migration 1710000000008.
 */
export class SeedWasabiCredentialFastXE1710000000007 implements MigrationInterface {
  name = 'SeedWasabiCredentialFastXE1710000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO card_proxy.wasabi_credentials (program_id, api_key, app_id, key_ref)
      VALUES (
        'fastXE',
        'REPLACE_WITH_WASABI_API_KEY',
        'REPLACE_WITH_WASABI_APP_ID',
        E'-----BEGIN PRIVATE KEY-----\\nREPLACE_WITH_RSA_PRIVATE_KEY_PEM_BODY\\n-----END PRIVATE KEY-----'
      )
      ON CONFLICT (program_id) DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM card_proxy.wasabi_credentials
      WHERE program_id = 'fastXE'
        AND api_key = 'REPLACE_WITH_WASABI_API_KEY';
    `);
  }
}
