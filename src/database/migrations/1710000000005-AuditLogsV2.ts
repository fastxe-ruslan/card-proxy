import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogsV21710000000005 implements MigrationInterface {
  name = 'AuditLogsV21710000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_type"     VARCHAR(50)  NOT NULL,
        "actor_id"       UUID,
        "action"         VARCHAR(100) NOT NULL,
        "entity_type"    VARCHAR(50),
        "entity_id"      UUID,
        "before_json"    JSONB,
        "after_json"     JSONB,
        "metadata_json"  JSONB,
        "ip"             VARCHAR(45),
        "user_agent"     TEXT,
        "correlation_id" UUID        NOT NULL,
        "is_sensitive"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actor_id_created_at" ON "audit_logs" ("actor_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action_created_at" ON "audit_logs" ("action", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_correlation_id" ON "audit_logs" ("correlation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_sensitive_created_at" ON "audit_logs" ("is_sensitive", "created_at" DESC)`,
    );

    await queryRunner.query(`
      ALTER TABLE "wasabi_request_logs"
        ADD COLUMN IF NOT EXISTS "wasabi_code"  VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "wasabi_msg"   TEXT,
        ADD COLUMN IF NOT EXISTS "success"      BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wrl_correlation_id"
        ON "wasabi_request_logs" ("correlation_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wrl_operation_created_at"
        ON "wasabi_request_logs" ("operation", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wrl_success_created_at"
        ON "wasabi_request_logs" ("success", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wrl_created_at"
        ON "wasabi_request_logs" ("created_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);

    await queryRunner.query(`ALTER TABLE "wasabi_request_logs"
      DROP COLUMN IF EXISTS "wasabi_code",
      DROP COLUMN IF EXISTS "wasabi_msg",
      DROP COLUMN IF EXISTS "success"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wrl_correlation_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_wrl_operation_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_wrl_success_created_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wrl_created_at"`);
  }
}
