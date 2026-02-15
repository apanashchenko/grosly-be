import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1771096110382 implements MigrationInterface {
  name = 'InitSchema1771096110382';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "allergies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_991993cf56ba0ec861aaf515da8" UNIQUE ("name"), CONSTRAINT "UQ_e5149c5c2e7ca5096fa72c2a08d" UNIQUE ("slug"), CONSTRAINT "PK_f72e0cf363a832b8fa8cf657118" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "dietary_restrictions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_c835ebe70028389be88573e99af" UNIQUE ("name"), CONSTRAINT "UQ_0cffecd67534d64fedf752eb14f" UNIQUE ("slug"), CONSTRAINT "PK_2cf1634e477dcebb27547ce9717" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" character varying, "icon" character varying, "user_id" uuid, CONSTRAINT "UQ_7adaf31d785359073c872966286" UNIQUE ("slug", "user_id"), CONSTRAINT "UQ_48f0690983e955b500b4a3e0293" UNIQUE ("name", "user_id"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_4c9fb58de893725258746385e16" UNIQUE ("name"), CONSTRAINT "UQ_464f927ae360106b783ed0b4106" UNIQUE ("slug"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "default_servings" integer NOT NULL DEFAULT '2', "custom_notes" text, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "REL_458057fa75b66e68a275647da2" UNIQUE ("user_id"), CONSTRAINT "PK_e8cfb5b31af61cd363a6b6d7c25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."space_members_role_enum" AS ENUM('OWNER', 'MEMBER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "space_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "space_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" "public"."space_members_role_enum" NOT NULL DEFAULT 'MEMBER', "joined_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a1d79ecdb8370f1e6d3463c0926" UNIQUE ("space_id", "user_id"), CONSTRAINT "PK_5aaa6440d7f1e8b8c051df43d5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "space_members_space_id_idx" ON "space_members" ("space_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "space_members_user_id_idx" ON "space_members" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."space_invitations_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "space_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "space_id" uuid NOT NULL, "inviter_id" uuid NOT NULL, "invitee_id" uuid, "email" character varying NOT NULL, "status" "public"."space_invitations_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4be9882bffb82c0ee4486363703" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "space_invitations_inviter_id_idx" ON "space_invitations" ("inviter_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "space_invitations_email_status_idx" ON "space_invitations" ("email", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "space_invitations_invitee_id_status_idx" ON "space_invitations" ("invitee_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "space_invitations_space_id_status_idx" ON "space_invitations" ("space_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "spaces" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "description" character varying(500), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dbe542974aca57afcb60709d4c8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "shopping_list_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "quantity" numeric(10,2) NOT NULL, "unit" character varying NOT NULL, "purchased" boolean NOT NULL DEFAULT false, "category_id" uuid, "note" character varying(100), "position" integer NOT NULL DEFAULT '0', "created_by_user_id" uuid, "shopping_list_id" uuid, CONSTRAINT "PK_043c112c02fdc1c39fbd619fadb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "shopping_list_items_category_id_idx" ON "shopping_list_items" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "shopping_list_items_shopping_list_id_idx" ON "shopping_list_items" ("shopping_list_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "shopping_list_items_created_by_user_id_idx" ON "shopping_list_items" ("created_by_user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shopping_lists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "user_id" uuid NOT NULL, "space_id" uuid, "grouped_by_categories" boolean NOT NULL DEFAULT false, "is_pinned" boolean NOT NULL DEFAULT false, "label" character varying(20), "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9289ace7dd5e768d65290f3f9de" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "shopping_lists_space_id_idx" ON "shopping_lists" ("space_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "shopping_lists_user_id_idx" ON "shopping_lists" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."plans_type_enum" AS ENUM('FREE', 'PRO', 'PREMIUM')`,
    );
    await queryRunner.query(
      `CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."plans_type_enum" NOT NULL, "max_recipe_generations_per_day" integer NOT NULL DEFAULT '0', "max_parse_requests_per_day" integer NOT NULL DEFAULT '0', "max_parse_image_requests_per_day" integer NOT NULL DEFAULT '0', "max_smart_group_requests_per_day" integer NOT NULL DEFAULT '0', "max_shopping_lists" integer NOT NULL DEFAULT '0', "max_custom_categories" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_61954b3f43036f3bca500b2c925" UNIQUE ("type"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "plan_id" uuid NOT NULL, "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'ACTIVE', "trial_ends_at" TIMESTAMP, "current_period_start" TIMESTAMP NOT NULL, "current_period_end" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d0a95ef8a28188364c546eb65c1" UNIQUE ("user_id"), CONSTRAINT "REL_d0a95ef8a28188364c546eb65c" UNIQUE ("user_id"), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "subscription_plan_id_idx" ON "subscriptions" ("plan_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "subscription_status_trial_ends_idx" ON "subscriptions" ("status", "trial_ends_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "meal_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "description" text, "number_of_days" integer NOT NULL DEFAULT '1', "number_of_people" integer NOT NULL DEFAULT '1', "user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6270d3206d074e2a2520f8d0a0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "meal_plans_user_id_idx" ON "meal_plans" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "meal_plan_recipes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "meal_plan_id" uuid NOT NULL, "recipe_id" uuid NOT NULL, "day_number" integer NOT NULL, "position" integer NOT NULL DEFAULT '0', CONSTRAINT "meal_plan_recipes_plan_recipe_day_uq" UNIQUE ("meal_plan_id", "recipe_id", "day_number"), CONSTRAINT "PK_d3551c893a027de9dc642abcb6f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "meal_plan_recipes_meal_plan_id_idx" ON "meal_plan_recipes" ("meal_plan_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "meal_plan_recipes_recipe_id_idx" ON "meal_plan_recipes" ("recipe_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "recipe_ingredients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recipe_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "quantity" numeric(10,2) NOT NULL, "unit" character varying(50) NOT NULL, "category_id" uuid, "note" character varying(100), "position" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_8f15a314e55970414fc92ffb532" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "recipe_ingredients_recipeid_idx" ON "recipe_ingredients" ("recipe_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "recipe_ingredients_category_id_idx" ON "recipe_ingredients" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."recipes_source_enum" AS ENUM('PARSED', 'PARSED_IMAGE', 'GENERATED', 'SUGGESTED', 'MEAL_PLAN', 'MANUAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "recipes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "source" "public"."recipes_source_enum" NOT NULL, "text" text NOT NULL, "user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8f09680a51bf3669c1598a21682" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "recipes_userid_idx" ON "recipes" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_auth_provider_enum" AS ENUM('GOOGLE', 'APPLE', 'EMAIL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying, "avatar_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "last_login_at" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, "language" character varying NOT NULL DEFAULT 'uk', "auth_provider" "public"."users_auth_provider_enum" NOT NULL DEFAULT 'GOOGLE', "provider_id" character varying, "refresh_token" character varying, "password_hash" character varying, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "users_authprovider_providerid_idx" ON "users" ("auth_provider", "provider_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_records_action_enum" AS ENUM('RECIPE_GENERATION', 'RECIPE_PARSE', 'RECIPE_SUGGEST', 'MEAL_PLAN_SAVE', 'PARSE_IMAGE', 'SMART_GROUP')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usage_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "action" "public"."usage_records_action_enum" NOT NULL, "date" date NOT NULL, "count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f9fcd8a78fbe483d3d2cf7c205e" UNIQUE ("user_id", "action", "date"), CONSTRAINT "PK_e511cf9f7dc53851569f87467a5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "usage_record_user_date_idx" ON "usage_records" ("user_id", "date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_categories" ("product_id" uuid NOT NULL, "category_id" uuid NOT NULL, CONSTRAINT "PK_54f2e1dbf14cfa770f59f0aac8f" PRIMARY KEY ("product_id", "category_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8748b4a0e8de6d266f2bbc877f" ON "product_categories" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9148da8f26fc248e77a387e311" ON "product_categories" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_allergens" ("product_id" uuid NOT NULL, "allergy_id" uuid NOT NULL, CONSTRAINT "PK_2d22d06e1992e6cb6acf149d513" PRIMARY KEY ("product_id", "allergy_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c91a725fcb1b0bc95e7b75a77" ON "product_allergens" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_486844e0573d253e789fa78fd5" ON "product_allergens" ("allergy_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_allergies" ("user_preferences_id" uuid NOT NULL, "allergy_id" uuid NOT NULL, CONSTRAINT "PK_851b37a13f32036f0b252a00ad9" PRIMARY KEY ("user_preferences_id", "allergy_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aec7d897ddaac90af34b71a369" ON "user_allergies" ("user_preferences_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7d119327ff1e3bbabca2e3d585" ON "user_allergies" ("allergy_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_dietary_restrictions" ("user_preferences_id" uuid NOT NULL, "dietary_restriction_id" uuid NOT NULL, CONSTRAINT "PK_8adc732a79bdce6981b04ab3955" PRIMARY KEY ("user_preferences_id", "dietary_restriction_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8903faf11b08720d98bff91edb" ON "user_dietary_restrictions" ("user_preferences_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b5e39d9bbb447aa540a280458f" ON "user_dietary_restrictions" ("dietary_restriction_id") `,
    );

    // Seed: system categories
    await queryRunner.query(`
      INSERT INTO categories (id, name, slug, description, icon, user_id) VALUES
        (gen_random_uuid(), 'Vegetables', 'vegetables', 'Fresh and frozen vegetables', '🥕', NULL),
        (gen_random_uuid(), 'Fruits', 'fruits', 'Fresh and frozen fruits', '🍎', NULL),
        (gen_random_uuid(), 'Meat', 'meat', 'Meat and meat products', '🥩', NULL),
        (gen_random_uuid(), 'Fish & Seafood', 'fish-seafood', 'Fish, shrimp, mussels, etc.', '🐟', NULL),
        (gen_random_uuid(), 'Dairy', 'dairy', 'Milk, cheese, yogurt, butter', '🥛', NULL),
        (gen_random_uuid(), 'Eggs', 'eggs', 'Chicken and quail eggs', '🥚', NULL),
        (gen_random_uuid(), 'Bread & Bakery', 'bread-bakery', 'Bread, rolls, baguettes, pita', '🍞', NULL),
        (gen_random_uuid(), 'Grains & Pasta', 'grains-pasta', 'Rice, buckwheat, oats, spaghetti', '🌾', NULL),
        (gen_random_uuid(), 'Baking', 'baking', 'Flour, sugar, yeast, baking powder', '🧁', NULL),
        (gen_random_uuid(), 'Oils & Sauces', 'oils-sauces', 'Oil, vinegar, ketchup, mayo, soy sauce', '🫒', NULL),
        (gen_random_uuid(), 'Spices & Seasonings', 'spices-seasonings', 'Salt, pepper, bay leaf, turmeric', '🧂', NULL),
        (gen_random_uuid(), 'Canned Goods', 'canned-goods', 'Canned vegetables, tomato paste, beans', '🥫', NULL),
        (gen_random_uuid(), 'Frozen Foods', 'frozen-foods', 'Frozen meals, vegetables, berries', '🧊', NULL),
        (gen_random_uuid(), 'Beverages', 'beverages', 'Water, juice, tea, coffee', '🥤', NULL),
        (gen_random_uuid(), 'Alcohol', 'alcohol', 'Wine, beer, spirits', '🍷', NULL),
        (gen_random_uuid(), 'Sweets & Snacks', 'sweets-snacks', 'Chocolate, cookies, chips, nuts', '🍫', NULL),
        (gen_random_uuid(), 'Nuts & Dried Fruits', 'nuts-dried-fruits', 'Walnuts, almonds, raisins, dried apricots', '🥜', NULL),
        (gen_random_uuid(), 'Fresh Herbs', 'fresh-herbs', 'Parsley, dill, basil, mint', '🌿', NULL),
        (gen_random_uuid(), 'Deli & Cold Cuts', 'deli-cold-cuts', 'Sausage, hot dogs, ham, bacon', '🌭', NULL),
        (gen_random_uuid(), 'Household', 'household', 'Cleaning supplies, napkins, cling wrap', '🧴', NULL),
        (gen_random_uuid(), 'Personal Care', 'personal-care', 'Soap, shampoo, toothpaste', '🧼', NULL),
        (gen_random_uuid(), 'Other', 'other', 'Everything that doesn''t fit other categories', '📦', NULL)
      ON CONFLICT DO NOTHING
    `);

    // Seed: allergies
    await queryRunner.query(`
      INSERT INTO allergies (id, name, slug, description) VALUES
        (gen_random_uuid(), 'Milk', 'milk', 'Allergy to cow milk and dairy products'),
        (gen_random_uuid(), 'Eggs', 'eggs', 'Allergy to chicken eggs'),
        (gen_random_uuid(), 'Peanuts', 'peanuts', 'Allergy to peanuts'),
        (gen_random_uuid(), 'Tree Nuts', 'tree-nuts', 'Allergy to tree nuts (almonds, cashews, walnuts, etc.)'),
        (gen_random_uuid(), 'Fish', 'fish', 'Allergy to fish'),
        (gen_random_uuid(), 'Shellfish', 'shellfish', 'Allergy to shellfish (shrimp, crab, lobster, etc.)'),
        (gen_random_uuid(), 'Wheat', 'wheat', 'Allergy to wheat'),
        (gen_random_uuid(), 'Soy', 'soy', 'Allergy to soybeans and soy products'),
        (gen_random_uuid(), 'Sesame', 'sesame', 'Allergy to sesame seeds'),
        (gen_random_uuid(), 'Gluten', 'gluten', 'Allergy to gluten (wheat, barley, rye)'),
        (gen_random_uuid(), 'Lactose', 'lactose', 'Intolerance to lactose in dairy products'),
        (gen_random_uuid(), 'Celery', 'celery', 'Allergy to celery and celeriac'),
        (gen_random_uuid(), 'Mustard', 'mustard', 'Allergy to mustard seeds and mustard products'),
        (gen_random_uuid(), 'Lupin', 'lupin', 'Allergy to lupin beans and flour'),
        (gen_random_uuid(), 'Molluscs', 'molluscs', 'Allergy to molluscs (squid, octopus, snails, etc.)')
      ON CONFLICT (slug) DO NOTHING
    `);

    // Seed: dietary restrictions
    await queryRunner.query(`
      INSERT INTO dietary_restrictions (id, name, slug, description) VALUES
        (gen_random_uuid(), 'Vegetarian', 'vegetarian', 'No meat or fish'),
        (gen_random_uuid(), 'Vegan', 'vegan', 'No animal products at all'),
        (gen_random_uuid(), 'Pescatarian', 'pescatarian', 'No meat, but fish and seafood are allowed'),
        (gen_random_uuid(), 'Keto', 'keto', 'High-fat, very low-carb diet'),
        (gen_random_uuid(), 'Paleo', 'paleo', 'No grains, legumes, dairy, or processed foods'),
        (gen_random_uuid(), 'Gluten-Free', 'gluten-free', 'No gluten-containing grains (wheat, barley, rye)'),
        (gen_random_uuid(), 'Dairy-Free', 'dairy-free', 'No dairy products'),
        (gen_random_uuid(), 'Low-Carb', 'low-carb', 'Reduced carbohydrate intake'),
        (gen_random_uuid(), 'Halal', 'halal', 'Food prepared according to Islamic dietary laws'),
        (gen_random_uuid(), 'Kosher', 'kosher', 'Food prepared according to Jewish dietary laws')
      ON CONFLICT (slug) DO NOTHING
    `);

    // Seed: subscription plans
    await queryRunner.query(`
      INSERT INTO plans (id, type, max_recipe_generations_per_day, max_parse_requests_per_day, max_shopping_lists, max_custom_categories) VALUES
        (gen_random_uuid(), 'FREE', 0, 0, 0, 0),
        (gen_random_uuid(), 'PRO', 0, 0, 0, 0),
        (gen_random_uuid(), 'PREMIUM', 0, 0, 0, 0)
      ON CONFLICT (type) DO NOTHING
    `);

    await queryRunner.query(
      `CREATE TABLE "user_favorite_products" ("user_preferences_id" uuid NOT NULL, "product_id" uuid NOT NULL, CONSTRAINT "PK_128d8963eef0b133db7e8d23fca" PRIMARY KEY ("user_preferences_id", "product_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_12ca887c37f2932f9c28dc73a0" ON "user_favorite_products" ("user_preferences_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce71c9d4ce234802e27f909c64" ON "user_favorite_products" ("product_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_2296b7fe012d95646fa41921c8b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" ADD CONSTRAINT "FK_458057fa75b66e68a275647da2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_members" ADD CONSTRAINT "FK_8be18c70ea832ef078452698b68" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_members" ADD CONSTRAINT "FK_fdb7c5ab4ad7f35ec45c08047c2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_invitations" ADD CONSTRAINT "FK_00f71647e2239fc6250a30fb6b6" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_invitations" ADD CONSTRAINT "FK_1f25364e30d199a1672ebb0bb1d" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_invitations" ADD CONSTRAINT "FK_144b251e9fbb897f90e7d3e3a67" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_list_items" ADD CONSTRAINT "FK_a9dc4f098e89a2f6fac5dba037f" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_list_items" ADD CONSTRAINT "FK_be2415721d166fa6c1152f0deb7" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_list_items" ADD CONSTRAINT "FK_05e6a9394e4ec5b78f15be7fe6a" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_lists" ADD CONSTRAINT "FK_1851ac0f1c24464395dbb4df7b7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_lists" ADD CONSTRAINT "FK_afb156662cc0f59516622f7a7a6" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_plans" ADD CONSTRAINT "FK_a94a25c51cc9b60a3c542c98986" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_plan_recipes" ADD CONSTRAINT "FK_0aeabf4765db908b5b9e4f4e2be" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_plan_recipes" ADD CONSTRAINT "FK_4d6d55eba596a9f19aa87b00f29" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "FK_f240137e0e13bed80bdf64fed53" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "FK_2a0a37ccea602ec3171434dfb40" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipes" ADD CONSTRAINT "FK_67d98fd6ff56c4340a811402154" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_records" ADD CONSTRAINT "FK_2930a10f82d7773e3ac09e78dd8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "FK_8748b4a0e8de6d266f2bbc877f6" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "FK_9148da8f26fc248e77a387e3112" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_allergens" ADD CONSTRAINT "FK_8c91a725fcb1b0bc95e7b75a776" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_allergens" ADD CONSTRAINT "FK_486844e0573d253e789fa78fd5a" FOREIGN KEY ("allergy_id") REFERENCES "allergies"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_allergies" ADD CONSTRAINT "FK_aec7d897ddaac90af34b71a3698" FOREIGN KEY ("user_preferences_id") REFERENCES "user_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_allergies" ADD CONSTRAINT "FK_7d119327ff1e3bbabca2e3d585b" FOREIGN KEY ("allergy_id") REFERENCES "allergies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_dietary_restrictions" ADD CONSTRAINT "FK_8903faf11b08720d98bff91edb1" FOREIGN KEY ("user_preferences_id") REFERENCES "user_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_dietary_restrictions" ADD CONSTRAINT "FK_b5e39d9bbb447aa540a280458f5" FOREIGN KEY ("dietary_restriction_id") REFERENCES "dietary_restrictions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_favorite_products" ADD CONSTRAINT "FK_12ca887c37f2932f9c28dc73a03" FOREIGN KEY ("user_preferences_id") REFERENCES "user_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_favorite_products" ADD CONSTRAINT "FK_ce71c9d4ce234802e27f909c64a" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_favorite_products" DROP CONSTRAINT "FK_ce71c9d4ce234802e27f909c64a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_favorite_products" DROP CONSTRAINT "FK_12ca887c37f2932f9c28dc73a03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_dietary_restrictions" DROP CONSTRAINT "FK_b5e39d9bbb447aa540a280458f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_dietary_restrictions" DROP CONSTRAINT "FK_8903faf11b08720d98bff91edb1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_allergies" DROP CONSTRAINT "FK_7d119327ff1e3bbabca2e3d585b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_allergies" DROP CONSTRAINT "FK_aec7d897ddaac90af34b71a3698"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_allergens" DROP CONSTRAINT "FK_486844e0573d253e789fa78fd5a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_allergens" DROP CONSTRAINT "FK_8c91a725fcb1b0bc95e7b75a776"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" DROP CONSTRAINT "FK_9148da8f26fc248e77a387e3112"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" DROP CONSTRAINT "FK_8748b4a0e8de6d266f2bbc877f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_records" DROP CONSTRAINT "FK_2930a10f82d7773e3ac09e78dd8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipes" DROP CONSTRAINT "FK_67d98fd6ff56c4340a811402154"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "FK_2a0a37ccea602ec3171434dfb40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "FK_f240137e0e13bed80bdf64fed53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_plan_recipes" DROP CONSTRAINT "FK_4d6d55eba596a9f19aa87b00f29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_plan_recipes" DROP CONSTRAINT "FK_0aeabf4765db908b5b9e4f4e2be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_plans" DROP CONSTRAINT "FK_a94a25c51cc9b60a3c542c98986"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_lists" DROP CONSTRAINT "FK_afb156662cc0f59516622f7a7a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_lists" DROP CONSTRAINT "FK_1851ac0f1c24464395dbb4df7b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_list_items" DROP CONSTRAINT "FK_05e6a9394e4ec5b78f15be7fe6a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_list_items" DROP CONSTRAINT "FK_be2415721d166fa6c1152f0deb7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_list_items" DROP CONSTRAINT "FK_a9dc4f098e89a2f6fac5dba037f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_invitations" DROP CONSTRAINT "FK_144b251e9fbb897f90e7d3e3a67"`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_invitations" DROP CONSTRAINT "FK_1f25364e30d199a1672ebb0bb1d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_invitations" DROP CONSTRAINT "FK_00f71647e2239fc6250a30fb6b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_members" DROP CONSTRAINT "FK_fdb7c5ab4ad7f35ec45c08047c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "space_members" DROP CONSTRAINT "FK_8be18c70ea832ef078452698b68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_458057fa75b66e68a275647da2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_2296b7fe012d95646fa41921c8b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ce71c9d4ce234802e27f909c64"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12ca887c37f2932f9c28dc73a0"`,
    );
    await queryRunner.query(`DROP TABLE "user_favorite_products"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b5e39d9bbb447aa540a280458f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8903faf11b08720d98bff91edb"`,
    );
    await queryRunner.query(`DROP TABLE "user_dietary_restrictions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7d119327ff1e3bbabca2e3d585"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aec7d897ddaac90af34b71a369"`,
    );
    await queryRunner.query(`DROP TABLE "user_allergies"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_486844e0573d253e789fa78fd5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c91a725fcb1b0bc95e7b75a77"`,
    );
    await queryRunner.query(`DROP TABLE "product_allergens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9148da8f26fc248e77a387e311"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8748b4a0e8de6d266f2bbc877f"`,
    );
    await queryRunner.query(`DROP TABLE "product_categories"`);
    await queryRunner.query(`DROP INDEX "public"."usage_record_user_date_idx"`);
    await queryRunner.query(`DROP TABLE "usage_records"`);
    await queryRunner.query(`DROP TYPE "public"."usage_records_action_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."users_authprovider_providerid_idx"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_auth_provider_enum"`);
    await queryRunner.query(`DROP INDEX "public"."recipes_userid_idx"`);
    await queryRunner.query(`DROP TABLE "recipes"`);
    await queryRunner.query(`DROP TYPE "public"."recipes_source_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."recipe_ingredients_category_id_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."recipe_ingredients_recipeid_idx"`,
    );
    await queryRunner.query(`DROP TABLE "recipe_ingredients"`);
    await queryRunner.query(
      `DROP INDEX "public"."meal_plan_recipes_recipe_id_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."meal_plan_recipes_meal_plan_id_idx"`,
    );
    await queryRunner.query(`DROP TABLE "meal_plan_recipes"`);
    await queryRunner.query(`DROP INDEX "public"."meal_plans_user_id_idx"`);
    await queryRunner.query(`DROP TABLE "meal_plans"`);
    await queryRunner.query(
      `DROP INDEX "public"."subscription_status_trial_ends_idx"`,
    );
    await queryRunner.query(`DROP INDEX "public"."subscription_plan_id_idx"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
    await queryRunner.query(`DROP TABLE "plans"`);
    await queryRunner.query(`DROP TYPE "public"."plans_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."shopping_lists_user_id_idx"`);
    await queryRunner.query(
      `DROP INDEX "public"."shopping_lists_space_id_idx"`,
    );
    await queryRunner.query(`DROP TABLE "shopping_lists"`);
    await queryRunner.query(
      `DROP INDEX "public"."shopping_list_items_created_by_user_id_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."shopping_list_items_shopping_list_id_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."shopping_list_items_category_id_idx"`,
    );
    await queryRunner.query(`DROP TABLE "shopping_list_items"`);
    await queryRunner.query(`DROP TABLE "spaces"`);
    await queryRunner.query(
      `DROP INDEX "public"."space_invitations_space_id_status_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."space_invitations_invitee_id_status_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."space_invitations_email_status_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."space_invitations_inviter_id_idx"`,
    );
    await queryRunner.query(`DROP TABLE "space_invitations"`);
    await queryRunner.query(
      `DROP TYPE "public"."space_invitations_status_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."space_members_user_id_idx"`);
    await queryRunner.query(`DROP INDEX "public"."space_members_space_id_idx"`);
    await queryRunner.query(`DROP TABLE "space_members"`);
    await queryRunner.query(`DROP TYPE "public"."space_members_role_enum"`);
    await queryRunner.query(`DROP TABLE "user_preferences"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "dietary_restrictions"`);
    await queryRunner.query(`DROP TABLE "allergies"`);
  }
}
