import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenUsageToAiRequestLogs1771096400000 implements MigrationInterface {
  name = 'AddTokenUsageToAiRequestLogs1771096400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_request_logs" ADD "prompt_tokens" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_request_logs" ADD "completion_tokens" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_request_logs" ADD "total_tokens" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_request_logs" DROP COLUMN "total_tokens"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_request_logs" DROP COLUMN "completion_tokens"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_request_logs" DROP COLUMN "prompt_tokens"`,
    );
  }
}
