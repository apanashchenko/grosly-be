import * as fs from 'fs';
import * as path from 'path';

const GRAPHQL_URL = 'https://auchan.ua/graphql/';
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const PAGE_SIZE = 100;

// "Продукты питания" root category
const FOOD_CATEGORY_ID = 5335;

interface AuchanCategory {
  id: number;
  name: string;
  url_key: string;
}

interface Product {
  name: string;
  price: number;
  oldPrice: number | null;
  quantity: number | null;
  unit: string;
  category: string;
}

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const url =
    `${GRAPHQL_URL}?query=${encodeURIComponent(query)}` +
    `&variables=${encodeURIComponent(JSON.stringify(variables))}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url.substring(0, 120)}`);
  }

  const json = (await res.json()) as {
    data: T;
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(`GraphQL error: ${json.errors[0].message}`);
  }
  return json.data;
}

async function fetchCategories(): Promise<AuchanCategory[]> {
  const query = `query categoryList($filters: CategoryFilterInput) {
    categoryList(filters: $filters) {
      id name url_key
      children { id name url_key }
    }
  }`;

  const data = await graphql<{
    categoryList: {
      id: number;
      name: string;
      url_key: string;
      children: { id: number; name: string; url_key: string }[];
    }[];
  }>(query, { filters: { ids: { eq: String(FOOD_CATEGORY_ID) } } });

  const parent = data.categoryList[0];
  if (!parent) throw new Error('Food category not found');

  const categories = parent.children.map((c) => ({
    id: c.id,
    name: c.name,
    url_key: c.url_key,
  }));

  console.log(`Found ${categories.length} categories`);
  return categories;
}

async function fetchCategoryProducts(
  category: AuchanCategory,
): Promise<Product[]> {
  const allProducts: Product[] = [];
  let currentPage = 1;

  const query = `query getCategoryProducts($filter: ProductAttributeFilterInput, $pageSize: Int, $currentPage: Int, $sort: ProductAttributeSortInput) {
    search: productsV2(filter: $filter, pageSize: $pageSize, currentPage: $currentPage, sort: $sort) {
      page_info { page_size total_pages }
      items {
        name
        stock_status
        price_range {
          minimum_price {
            regular_price { value }
            final_price { value }
            discount { percent_off }
          }
        }
      }
    }
  }`;

  while (true) {
    const data = await graphql<{
      search: {
        page_info: { page_size: number; total_pages: number };
        items: {
          name: string;
          stock_status: string;
          price_range: {
            minimum_price: {
              regular_price: { value: number };
              final_price: { value: number };
              discount: { percent_off: number };
            };
          };
        }[];
      };
    }>(query, {
      currentPage,
      filter: { category_id: { eq: String(category.id) } },
      sort: { position: 'ASC' },
      pageSize: PAGE_SIZE,
    });

    const { items, page_info } = data.search;
    if (items.length === 0) break;

    const prevCount = allProducts.length;

    for (const item of items) {
      if (item.stock_status !== 'IN_STOCK') continue;

      const priceData = item.price_range.minimum_price;
      const price = priceData.final_price.value;
      const oldPrice =
        priceData.discount.percent_off > 0
          ? priceData.regular_price.value
          : null;

      allProducts.push({
        name: item.name,
        price,
        oldPrice,
        quantity: null,
        unit: 'шт',
        category: category.name,
      });
    }

    const inStockOnPage = allProducts.length - prevCount;

    console.log(
      `  ${category.name}: ${allProducts.length} products (page ${currentPage}/${page_info.total_pages})`,
    );

    // Stop early if no in-stock products on this page (remaining pages are all OUT_OF_STOCK)
    if (inStockOnPage === 0) break;

    if (currentPage >= page_info.total_pages) break;
    currentPage++;
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
  console.log('Starting Auchan parser...');

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
  const filePath = path.join(OUTPUT_DIR, `auchan-${date}.csv`);
  writeCsv(allProducts, filePath);

  console.log(`\nDone! ${allProducts.length} products saved to ${filePath}`);
}

main().catch(console.error);
