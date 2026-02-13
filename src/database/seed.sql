-- Categories (system-level, user_id = NULL)
INSERT INTO categories (id, name, slug, description, icon, user_id)
VALUES
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
ON CONFLICT DO NOTHING;

-- Allergies
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
ON CONFLICT (slug) DO NOTHING;

-- Dietary Restrictions
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
ON CONFLICT (slug) DO NOTHING;

-- Plans
INSERT INTO plans (id, type, max_recipe_generations_per_day, max_parse_requests_per_day, max_shopping_lists, max_custom_categories)
VALUES
  (gen_random_uuid(), 'FREE', 0, 0, 0, 0),
  (gen_random_uuid(), 'PRO', 0, 0, 0, 0),
  (gen_random_uuid(), 'PREMIUM', 0, 0, 0, 0)
ON CONFLICT (type) DO NOTHING;
