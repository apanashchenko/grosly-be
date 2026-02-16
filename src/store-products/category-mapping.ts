// Store category name (lowercase) -> system category slug
// Used during CSV upload to auto-map StoreCategory -> Category

const STORE_CATEGORY_MAP = new Map<string, string>([
  // --- Dairy ---
  ['молочні продукти та яйця', 'dairy'],
  ['молочные продукты и яйца', 'dairy'],
  ['яйця та молочні продукти', 'dairy'],
  ['сири', 'dairy'],
  // --- Meat ---
  ["м'ясо", 'meat'],
  ["м'ясо та напівфабрикати", 'meat'],
  ["м'ясо та ковбасні вироби", 'meat'],
  // --- Deli & Cold Cuts ---
  ["ковбаса і м'ясні делікатеси", 'deli-cold-cuts'],
  ["ковбаси і м'ясні делікатеси", 'deli-cold-cuts'],
  ['ковбаси, сосиски, делікатеси', 'deli-cold-cuts'],
  // --- Fish & Seafood ---
  ['риба і морепродукти', 'fish-seafood'],
  ['риба та морепродукти', 'fish-seafood'],
  ['риба', 'fish-seafood'],
  // --- Fruits ---
  ['овочі та фрукти', 'fruits'],
  ['фрукти, овочі', 'fruits'],
  ['фрукти, овочі, горіхи', 'fruits'],
  ['фрукти та овочі', 'fruits'],
  // --- Bread & Bakery ---
  ['хлібобулочні вироби', 'bread-bakery'],
  ['хліб та випічка', 'bread-bakery'],
  ['пекарня', 'bread-bakery'],
  // --- Grains & Pasta ---
  ['бакалія', 'grains-pasta'],
  ['бакалея', 'grains-pasta'],
  ['бакалія і консерви', 'grains-pasta'],
  // --- Canned Goods ---
  ['консервація та соління', 'canned-goods'],
  ['консервация', 'canned-goods'],
  ['консерви', 'canned-goods'],
  // --- Oils & Sauces ---
  ['соуси і спеції', 'oils-sauces'],
  ['соуси та спеції', 'oils-sauces'],
  // --- Frozen Foods ---
  ['заморожені продукти', 'frozen-foods'],
  ['заморожена продукція', 'frozen-foods'],
  ['заморозка', 'frozen-foods'],
  ['готові страви і кулінарія', 'frozen-foods'],
  ['кулінарія', 'frozen-foods'],
  // --- Beverages ---
  ['напої безалкогольні', 'beverages'],
  ['напої', 'beverages'],
  ['вода, соки, напої', 'beverages'],
  ['вода и напитки', 'beverages'],
  // --- Hot drinks -> Beverages ---
  ['кава, чай', 'beverages'],
  ['чай, кава, гарячі напої', 'beverages'],
  ['гарячі напої', 'beverages'],
  ['горячие напитки', 'beverages'],
  // --- Alcohol ---
  ['алкоголь', 'alcohol'],
  // --- Sweets & Snacks ---
  ['кондитерські вироби', 'sweets-snacks'],
  ['кондитерські вироби та солодощі', 'sweets-snacks'],
  ['солодощі', 'sweets-snacks'],
  ['сладости', 'sweets-snacks'],
  ['чіпси, снеки', 'sweets-snacks'],
  ['чипсы, снеки', 'sweets-snacks'],
  ['снеки та чипси', 'sweets-snacks'],
  ['снеки', 'sweets-snacks'],
  ['чипси та снеки', 'sweets-snacks'],
  // --- Personal Care ---
  ['гігієна і косметика', 'personal-care'],
  ['гігієна та краса', 'personal-care'],
  ['гігієна та догляд', 'personal-care'],
  ["аптечка здоров'я", 'personal-care'],
  ['бади', 'personal-care'],
  // --- Household ---
  ['побутова хімія та непродовольчі товари', 'household'],
  ['побутова хімія', 'household'],
  ['товари для дому', 'household'],
  ['для дому', 'household'],
  ['кухня', 'household'],
  ["інтер'єр та текстиль", 'household'],
  // --- Nuts & Dried Fruits ---
  ['сухофрукты и орехи', 'nuts-dried-fruits'],
  // --- Healthy eating -> Grains & Pasta ---
  ['здорове харчування', 'grains-pasta'],
  ['здорове харчування та спосіб життя', 'grains-pasta'],
  ['здоровое питание', 'grains-pasta'],
  ['органические товары', 'grains-pasta'],
  ['товари мира', 'grains-pasta'],
]);

export function resolveSystemCategorySlug(
  storeCategoryName: string,
): string | null {
  return STORE_CATEGORY_MAP.get(storeCategoryName.toLowerCase().trim()) ?? null;
}
