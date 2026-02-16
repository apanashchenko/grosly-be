import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoreProducts1771181900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stores" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_stores_name" UNIQUE ("name"),
        CONSTRAINT "UQ_stores_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "store_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "category_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_store_categories_store_slug" UNIQUE ("store_id", "slug"),
        CONSTRAINT "FK_store_categories_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_store_categories_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "store_products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "store_category_id" uuid,
        "external_slug" varchar NOT NULL,
        "name" varchar NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "old_price" decimal(10,2),
        "quantity" decimal(10,2),
        "unit" varchar NOT NULL,
        "in_stock" boolean NOT NULL DEFAULT true,
        "last_scraped_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_products" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_store_products_store_slug" UNIQUE ("store_id", "external_slug"),
        CONSTRAINT "FK_store_products_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_store_products_category" FOREIGN KEY ("store_category_id") REFERENCES "store_categories"("id") ON DELETE SET NULL
      )
    `);

    // Indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_store_categories_store_id" ON "store_categories" ("store_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_store_products_store_id" ON "store_products" ("store_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_store_products_name" ON "store_products" ("name")`,
    );

    // pg_trgm for fast ILIKE '%query%' searches
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_products_name_trgm"
        ON "store_products" USING gin ("name" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_products_store_scraped"
        ON "store_products" ("store_id", "last_scraped_at")
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_store_products_store_category_id" ON "store_products" ("store_category_id")`,
    );
    await queryRunner.query(`
      CREATE INDEX "IDX_store_products_in_stock"
        ON "store_products" ("in_stock")
        WHERE "in_stock" = true
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_store_categories_category_id" ON "store_categories" ("category_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_store_categories_category_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_store_products_in_stock"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_store_products_store_category_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_store_products_store_scraped"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_store_products_name_trgm"`,
    );
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_products_name"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_store_products_store_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_store_categories_store_id"`,
    );
    await queryRunner.query(`DROP TABLE "store_products"`);
    await queryRunner.query(`DROP TABLE "store_categories"`);
    await queryRunner.query(`DROP TABLE "stores"`);
  }
}
