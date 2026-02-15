import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiRequestLogs1771096300000 implements MigrationInterface {
  name = 'AddAiRequestLogs1771096300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ai_request_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "action" "public"."usage_records_action_enum" NOT NULL,
        "input" character varying(5000) NOT NULL,
        "output" jsonb,
        "success" boolean NOT NULL DEFAULT true,
        "error_message" character varying(500),
        "duration_ms" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_request_logs" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "ai_request_logs_user_id_idx" ON "ai_request_logs" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ai_request_logs_action_idx" ON "ai_request_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ai_request_logs_created_at_idx" ON "ai_request_logs" ("created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_request_logs" ADD CONSTRAINT "FK_ai_request_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_request_logs" DROP CONSTRAINT "FK_ai_request_logs_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."ai_request_logs_created_at_idx"`,
    );
    await queryRunner.query(`DROP INDEX "public"."ai_request_logs_action_idx"`);
    await queryRunner.query(
      `DROP INDEX "public"."ai_request_logs_user_id_idx"`,
    );
    await queryRunner.query(`DROP TABLE "ai_request_logs"`);
  }
}
