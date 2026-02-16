import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'https://stores-api.zakaz.ua';
const STORE_ID = '48201070';
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const PAGE_SIZE = 100;

// Skip promo/collection categories (not real product categories)
const SKIP_CATEGORY_IDS = new Set(['special-offer-all-novus']);

interface NovusCategory {
  id: string;
  title: string;
  count: number;
}

interface Product {
  name: string;
  price: number;
  oldPrice: number | null;
  quantity: number | null;
  unit: string;
  category: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'uk' },
    });
    if (res.status === 503 && attempt < retries) {
      const delay = attempt * 2000;
      console.log(
        `    503 — retrying in ${delay / 1000}s (attempt ${attempt}/${retries})`,
      );
      await sleep(delay);
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${url.substring(0, 120)}`);
    }
    return res.json() as Promise<T>;
  }
  throw new Error(`Failed after ${retries} retries: ${url.substring(0, 120)}`);
}

async function fetchCategories(): Promise<NovusCategory[]> {
  const data = await fetchJson<
    { id: string; title: string; count: number; is_collection: boolean }[]
  >(`${API_BASE}/stores/${STORE_ID}/categories/?only_parents=true`);

  const categories = data
    .filter((c) => !SKIP_CATEGORY_IDS.has(c.id) && !c.is_collection)
    .map((c) => ({ id: c.id, title: c.title.trim(), count: c.count }));

  console.log(`Found ${categories.length} categories`);
  return categories;
}

async function fetchCategoryProducts(
  category: NovusCategory,
): Promise<Product[]> {
  const allProducts: Product[] = [];
  let page = 1;

  while (true) {
    const data = await fetchJson<{
      count: number;
      results: {
        title: string;
        price: number;
        discount: {
          status: boolean;
          old_price: number;
        };
        unit: string;
        weight: number;
        volume: number | null;
        in_stock: boolean;
      }[];
    }>(
      `${API_BASE}/stores/${STORE_ID}/categories/${category.id}/products/?page=${page}&per_page=${PAGE_SIZE}`,
    );

    if (data.results.length === 0) break;

    const prevCount = allProducts.length;

    for (const item of data.results) {
      if (!item.in_stock) continue;

      const price = item.price / 100;
      const oldPrice =
        item.discount.status && item.discount.old_price > item.price
          ? item.discount.old_price / 100
          : null;

      let quantity: number | null = null;
      let unit = 'шт';
      if (item.unit === 'kg') {
        unit = 'кг';
      } else if (item.weight && item.weight > 0) {
        quantity = item.weight;
        unit = 'г';
      } else if (item.volume && item.volume > 0) {
        quantity = item.volume;
        unit = 'мл';
      }

      allProducts.push({
        name: item.title,
        price,
        oldPrice,
        quantity,
        unit,
        category: category.title,
      });
    }

    const inStockOnPage = allProducts.length - prevCount;

    console.log(
      `  ${category.title}: ${allProducts.length}/${data.count} products (page ${page})`,
    );

    // Stop early if no in-stock products on this page
    if (inStockOnPage === 0) break;

    if (allProducts.length >= data.count || data.results.length < PAGE_SIZE)
      break;
    page++;
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
  console.log('Starting Novus parser...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const categories = await fetchCategories();
  const allProducts: Product[] = [];

  for (const category of categories) {
    console.log(`\nScraping: ${category.title}`);
    const products = await fetchCategoryProducts(category);
    allProducts.push(...products);
    console.log(`  Total for ${category.title}: ${products.length}`);
  }

  const date = new Date().toISOString().split('T')[0];
  const filePath = path.join(OUTPUT_DIR, `novus-${date}.csv`);
  writeCsv(allProducts, filePath);

  console.log(`\nDone! ${allProducts.length} products saved to ${filePath}`);
}

main().catch(console.error);
