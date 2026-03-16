import { MigrationInterface, QueryRunner } from 'typeorm';

export class CardDomainV2Migration1710000000003 implements MigrationInterface {
  name = 'CardDomainV2Migration1710000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE card_proxy.users
        ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'user';
    `);

    await queryRunner.query(
      `DROP TABLE IF EXISTS card_proxy.card_accounts CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.cards CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE card_proxy.cardholders (
        id                        UUID        NOT NULL DEFAULT gen_random_uuid(),
        user_id                   UUID        NOT NULL,
        wasabi_holder_id          VARCHAR     UNIQUE,
        wasabi_merchant_order_no  VARCHAR,
        status                    VARCHAR     NOT NULL DEFAULT 'wait_audit',
        status_reason             TEXT,
        account_type              VARCHAR     NOT NULL DEFAULT 'personal',
        version                   VARCHAR     NOT NULL DEFAULT 'v1',
        program_id                VARCHAR     NOT NULL,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_cardholders PRIMARY KEY (id),
        CONSTRAINT fk_cardholders_user FOREIGN KEY (user_id)
          REFERENCES card_proxy.users(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_cardholders_user_id ON card_proxy.cardholders (user_id);`,
    );

    await queryRunner.query(`
      CREATE TABLE card_proxy.cards (
        id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
        user_id             UUID        NOT NULL,
        holder_id           UUID        NOT NULL,
        wasabi_card_no      VARCHAR     UNIQUE,
        wasabi_order_no     VARCHAR,
        merchant_order_no   VARCHAR     NOT NULL,
        type                VARCHAR     NOT NULL DEFAULT 'virtual',
        status              VARCHAR     NOT NULL DEFAULT 'pending',
        program_id          VARCHAR     NOT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_cards PRIMARY KEY (id),
        CONSTRAINT fk_cards_user FOREIGN KEY (user_id)
          REFERENCES card_proxy.users(id) ON DELETE CASCADE,
        CONSTRAINT fk_cards_holder FOREIGN KEY (holder_id)
          REFERENCES card_proxy.cardholders(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_cards_user_id ON card_proxy.cards (user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_cards_holder_id ON card_proxy.cards (holder_id);`,
    );
  
    await queryRunner.query(`
      CREATE TABLE card_proxy.card_transactions (
        id                UUID        NOT NULL DEFAULT gen_random_uuid(),
        card_id           UUID        NOT NULL,
        wasabi_txn_id     VARCHAR     NOT NULL UNIQUE,
        merchant_name     VARCHAR,
        amount            NUMERIC(18,4) NOT NULL,
        currency          VARCHAR(3)  NOT NULL,
        direction         VARCHAR     NOT NULL DEFAULT 'debit',
        status            VARCHAR     NOT NULL DEFAULT 'pending',
        transaction_type  VARCHAR     NOT NULL DEFAULT 'auth',
        occurred_at       TIMESTAMPTZ,
        raw_payload       JSONB,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_card_transactions PRIMARY KEY (id),
        CONSTRAINT fk_card_transactions_card FOREIGN KEY (card_id)
          REFERENCES card_proxy.cards(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_card_transactions_wasabi_txn_id ON card_proxy.card_transactions (wasabi_txn_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_card_transactions_card_occurred ON card_proxy.card_transactions (card_id, occurred_at DESC);`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS card_proxy.card_transactions;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.cards;`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_proxy.cardholders;`);
    await queryRunner.query(
      `ALTER TABLE card_proxy.users DROP COLUMN IF EXISTS role;`,
    );
  }
}
