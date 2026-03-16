import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionsV21710000000006 implements MigrationInterface {
  name = 'SubscriptionsV21710000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS UQ_subscriptions_user_active
        ON card_proxy.subscriptions (user_id)
        WHERE status = 'active'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS card_proxy.UQ_subscriptions_user_active`,
    );
  }
}
