import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'https://varus.ua/api/catalog/vue_storefront_catalog_2';
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const PAGE_SIZE = 100;

const SOURCE_INCLUDE =
  'name,sqpp_data_region_default,category,category_ids,stock.is_in_stock,stock.qty,stock.manage_stock,stock.is_qty_decimal,sku,id,slug,url_key,url_path,type_id,weight,wghweigh,packingtype,is_new,is_18_plus,is_tobacco,productquantityunitstep,productminsalablequantity,fv_image_timestamp';

// Categories to skip (promo/brands/loyalty, not real product categories)
const SKIP_CATEGORY_IDS = new Set([
  13762, // Спецпропозиції
  59859, // Зимова підтримка
  58819, // Національний кешбек
  59856, // Ціна тижня
  59179, // Тільки онлайн
  59543, // Здорове харчування та Еко товари
  59597, // Власні марки
  14779, // Бонусна програма VARUS
  470, // Бренди
]);

interface VarusCategory {
  id: number;
  name: string;
  url: string;
}

interface Product {
  name: string;
  price: number;
  oldPrice: number | null;
  quantity: number | null;
  unit: string;
  category: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url.substring(0, 100)}`);
  }
  return res.json() as Promise<T>;
}

async function fetchCategories(): Promise<VarusCategory[]> {
  const query = {
    _availableFilters: [],
    _appliedFilters: [
      { attribute: 'is_active', value: { eq: true }, scope: 'default' },
      { attribute: 'level', value: { eq: 2 }, scope: 'default' },
    ],
    _appliedSort: [{ field: 'position', options: { order: 'asc' } }],
    _searchText: '',
  };

  const url =
    `${API_BASE}/category/_search?` +
    `_source_include=name,url_path,id,parent_id,level,children_count` +
    `&from=0&size=100` +
    `&request=${encodeURIComponent(JSON.stringify(query))}` +
    `&request_format=search-query&response_format=compact`;

  const data = await fetchJson<{
    hits: { id: number; name: string; url_path: string }[];
  }>(url);

  const categories = data.hits
    .filter((c) => !SKIP_CATEGORY_IDS.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, url: c.url_path }));

  console.log(`Found ${categories.length} categories`);
  return categories;
}

async function fetchCategoryProducts(
  category: VarusCategory,
): Promise<Product[]> {
  const allProducts: Product[] = [];
  let from = 0;

  while (true) {
    const query = {
      _availableFilters: [],
      _appliedFilters: [
        {
          attribute: 'visibility',
          value: { in: [2, 4] },
          scope: 'default',
        },
        {
          attribute: 'status',
          value: { in: [0, 1] },
          scope: 'default',
        },
        {
          attribute: 'category_ids',
          value: { in: [category.id] },
          scope: 'default',
        },
        {
          attribute: 'sqpp_data_region_default.in_stock',
          value: { eq: true },
          scope: 'default',
        },
      ],
      _appliedSort: [
        { field: 'category_position_2', options: { order: 'desc' } },
        { field: 'sqpp_score', options: { order: 'desc' } },
      ],
      _searchText: '',
    };

    const url =
      `${API_BASE}/product_v2/_search?` +
      `_source_exclude=description` +
      `&_source_include=${encodeURIComponent(SOURCE_INCLUDE)}` +
      `&from=${from}&size=${PAGE_SIZE}` +
      `&request=${encodeURIComponent(JSON.stringify(query))}` +
      `&request_format=search-query&response_format=compact`;

    const data = await fetchJson<{
      hits: {
        name: string;
        sqpp_data_region_default?: {
          price: number;
          special_price: number | null;
          in_stock: boolean;
        };
        weight: number;
        category?: {
          name: string;
          is_product_category: boolean;
          level: number;
        }[];
      }[];
      total: { value: number };
    }>(url);

    if (data.hits.length === 0) break;

    for (const item of data.hits) {
      const regional = item.sqpp_data_region_default;
      if (!regional) continue;

      const price = regional.special_price || regional.price;
      const oldPrice =
        regional.special_price && regional.special_price < regional.price
          ? regional.price
          : null;

      // Get the product category name (level 2, is_product_category)
      const cat = item.category?.find(
        (c) => c.is_product_category && c.level === 2,
      );

      const weight = item.weight;
      const quantity = weight && weight > 0 ? weight : null;
      const unit = weight && weight > 0 ? 'г' : 'шт';

      allProducts.push({
        name: item.name,
        price,
        oldPrice,
        quantity,
        unit,
        category: cat?.name || category.name,
      });
    }

    const total =
      typeof data.total === 'object' ? data.total.value : data.total;

    console.log(`  ${category.name}: ${allProducts.length}/${total} products`);

    from += PAGE_SIZE;
    if (from >= total) break;
  }

  return allProducts;
}

function escapeCsvField(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeCsv(products: Product[], filePath: string): void {
  const header = 'name;price;oldPrice;quantity;unit;category';
  const lines = products.map(
    (p) =>
      `${escapeCsvField(p.name)};${p.price};${p.oldPrice ?? ''};${p.quantity ?? ''};${p.unit};${escapeCsvField(p.category)}`,
  );

  fs.writeFileSync(filePath, [header, ...lines].join('\n'), 'utf-8');
}

async function main(): Promise<void> {
  console.log('Starting Varus parser...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const categories = await fetchCategories();
  const allProducts: Product[] = [];

  for (const category of categories) {
    console.log(`\nScraping: ${category.name}`);
    const products = await fetchCategoryProducts(category);
    allProducts.push(...products);
    console.log(`  Total for ${category.name}: ${products.length}`);
  }

  const date = new Date().toISOString().split('T')[0];
  const filePath = path.join(OUTPUT_DIR, `varus-${date}.csv`);
  writeCsv(allProducts, filePath);

  console.log(`\nDone! ${allProducts.length} products saved to ${filePath}`);
}

main().catch(console.error);
