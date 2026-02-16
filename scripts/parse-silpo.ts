import * as fs from 'fs';
import * as path from 'path';

const API_BASE =
  'https://sf-ecom-api.silpo.ua/v1/uk/branches/00000000-0000-0000-0000-000000000000';
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const PAGE_SIZE = 100;

interface SilpoCategory {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
}

interface Product {
  name: string;
  price: number;
  oldPrice: number | null;
  quantity: number | null;
  unit: string;
  category: string;
}

function parseDisplayRatio(ratio: string | undefined): {
  quantity: number | null;
  unit: string;
} {
  if (!ratio) return { quantity: null, unit: 'шт' };
  const trimmed = ratio.trim().toLowerCase();
  const match = trimmed.match(/^([\d.,]+)\s*(кг|г|мл|л|шт)$/);
  if (match) {
    return { quantity: parseFloat(match[1].replace(',', '.')), unit: match[2] };
  }
  // Unit-only values like "кг", "шт"
  const unitOnly = trimmed.match(/^(кг|г|мл|л|шт)$/);
  if (unitOnly) return { quantity: null, unit: unitOnly[1] };
  return { quantity: null, unit: ratio.trim() };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchCategories(): Promise<SilpoCategory[]> {
  const data = await fetchJson<{
    items: SilpoCategory[];
    total: number;
  }>(`${API_BASE}/categories?limit=1000&offset=0`);

  // Only top-level categories (parentId is null)
  const topLevel = data.items.filter((c) => c.parentId === null);
  console.log(
    `Found ${topLevel.length} top-level categories (${data.total} total)`,
  );
  return topLevel;
}

async function fetchCategoryProducts(
  category: SilpoCategory,
): Promise<Product[]> {
  const allProducts: Product[] = [];
  let offset = 0;

  while (true) {
    const data = await fetchJson<{
      items: {
        title: string;
        price: number;
        oldPrice: number | null;
        displayRatio: string;
        stock: number;
      }[];
      total: number;
    }>(
      `${API_BASE}/products?limit=${PAGE_SIZE}&offset=${offset}&deliveryType=DeliveryHome&category=${category.slug}&includeChildCategories=true&sortBy=popularity&sortDirection=desc&inStock=true`,
    );

    if (data.items.length === 0) break;

    for (const item of data.items) {
      const parsed = parseDisplayRatio(item.displayRatio);
      allProducts.push({
        name: item.title,
        price: item.price,
        oldPrice: item.oldPrice || null,
        quantity: parsed.quantity,
        unit: parsed.unit,
        category: category.title,
      });
    }

    console.log(
      `  ${category.title}: ${allProducts.length}/${data.total} products`,
    );

    offset += PAGE_SIZE;
    if (offset >= data.total) break;
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
  console.log('Starting Silpo parser...');

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
  const filePath = path.join(OUTPUT_DIR, `silpo-${date}.csv`);
  writeCsv(allProducts, filePath);

  console.log(`\nDone! ${allProducts.length} products saved to ${filePath}`);
}

main().catch(console.error);
