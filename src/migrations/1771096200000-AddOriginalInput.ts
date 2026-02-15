import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginalInput1771096200000 implements MigrationInterface {
  name = 'AddOriginalInput1771096200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recipes" ADD "original_input" character varying(5000)`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_plans" ADD "original_input" character varying(5000)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meal_plans" DROP COLUMN "original_input"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipes" DROP COLUMN "original_input"`,
    );
  }
}
