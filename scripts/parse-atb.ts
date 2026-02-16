import { chromium, type Page } from 'playwright';
import { addExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://www.atbmarket.com';
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

interface Category {
  name: string;
  slug: string;
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

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// function randomDelay(min = 1000, max = 3000): Promise<void> {
//   return delay(Math.floor(Math.random() * (max - min) + min));
// }

async function waitForCloudflare(page: Page): Promise<void> {
  const maxWait = 30_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const title = await page.title();
    const url = page.url();

    // Cloudflare challenge pages have specific titles/patterns
    if (
      title.includes('Just a moment') ||
      title.includes('Attention Required') ||
      url.includes('challenge') ||
      title === ''
    ) {
      console.log('  Waiting for Cloudflare challenge to pass...');
      await delay(2000);
      continue;
    }
    return;
  }

  console.log('  Cloudflare wait timed out, proceeding anyway...');
}

async function scrapeCategories(page: Page): Promise<Category[]> {
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30_000 });
  await waitForCloudflare(page);
  // await randomDelay(2000, 4000);
  await page.click('button:has-text("Каталог товарів")');
  // await randomDelay();
  await page.waitForSelector('nav[aria-label="Розділи каталога"]');

  const categories = await page.evaluate(() => {
    // Only top-level category links (direct children of the main list)
    const listItems = document.querySelectorAll(
      'nav[aria-label="Розділи каталога"] > div > ul > li',
    );
    const result: { name: string; slug: string; url: string }[] = [];
    const skipSlugs = ['economy', 'novetly'];

    for (const li of listItems) {
      const link = li.querySelector(':scope > a');
      if (!link) continue;

      const href = link.getAttribute('href') || '';
      const name = link.textContent?.trim() || '';
      const slug = href.replace('/catalog/', '');

      if (!href.startsWith('/catalog/') || skipSlugs.includes(slug)) continue;

      result.push({ name, slug, url: href });
    }
    return result;
  });

  console.log(`Found ${categories.length} categories`);
  return categories;
}

async function scrapeProductsFromPage(page: Page): Promise<Product[]> {
  return page.evaluate(() => {
    const items = document.querySelectorAll(
      'article.catalog-item:not(.catalog-item--not-available)',
    );
    const products: {
      name: string;
      price: number;
      oldPrice: number | null;
      quantity: number | null;
      unit: string;
      category: string;
    }[] = [];

    for (const el of items) {
      const name = (
        el.querySelector('.catalog-item__title a') as HTMLElement
      )?.textContent?.trim();
      const priceData = el.querySelector(
        '.product-price__top',
      ) as HTMLDataElement;
      const price = parseFloat(priceData?.value || '0');
      const oldPriceText = (
        el.querySelector('.product-price__bottom') as HTMLElement
      )?.textContent?.trim();
      const oldPrice = oldPriceText ? parseFloat(oldPriceText) : null;
      const unitText = (
        el.querySelector('.product-price__unit') as HTMLElement
      )?.textContent?.trim();
      const unit = unitText?.replace('/', '') || 'шт';

      if (name && price > 0) {
        products.push({
          name,
          price,
          oldPrice,
          quantity: null,
          unit,
          category: '',
        });
      }
    }

    return products;
  });
}

async function scrapeCategoryProducts(
  page: Page,
  category: Category,
): Promise<Product[]> {
  const allProducts: Product[] = [];
  let pageNum = 1;

  while (true) {
    const url =
      pageNum === 1
        ? `${BASE_URL}${category.url}`
        : `${BASE_URL}${category.url}?page=${pageNum}`;

    try {
      // await randomDelay(1500, 3500);
      await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
      await waitForCloudflare(page);
      // await randomDelay();
      await page
        .waitForSelector('article.catalog-item', { timeout: 10_000 })
        .catch(() => null);
    } catch {
      break;
    }

    const products = await scrapeProductsFromPage(page);
    if (products.length === 0) break;

    for (const p of products) {
      p.category = category.name;
    }
    allProducts.push(...products);

    console.log(
      `  ${category.name} page ${pageNum}: ${products.length} products`,
    );

    // Check if there is a next page
    const hasNextPage = await page.evaluate((currentPage: number) => {
      const links = document.querySelectorAll(
        '.product-pagination__link, a[href*="page="]',
      );
      for (const link of links) {
        const pageNum = parseInt(link.textContent?.trim() || '0');
        if (pageNum === currentPage + 1) return true;
      }
      return false;
    }, pageNum);

    if (!hasNextPage) break;
    pageNum++;
    // await randomDelay(2000, 4000);
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
  console.log('Starting ATB parser...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const userDataDir = path.join(__dirname, '..', '.browser-data', 'atb');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const chromiumExtra = addExtra(chromium);
  chromiumExtra.use(StealthPlugin());

  const context = await chromiumExtra.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    locale: 'uk-UA',
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    // First visit — wait for Cloudflare (solve manually if needed)
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60_000 });
    await waitForCloudflare(page);
    console.log('Cloudflare passed, starting scrape...');
    // await randomDelay(2000, 4000);

    const categories = await scrapeCategories(page);
    const allProducts: Product[] = [];

    for (const category of categories) {
      console.log(`\nScraping: ${category.name}`);
      const products = await scrapeCategoryProducts(page, category);
      allProducts.push(...products);
      console.log(`  Total for ${category.name}: ${products.length}`);
      // await randomDelay(2000, 5000);
    }

    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(OUTPUT_DIR, `atb-${date}.csv`);
    writeCsv(allProducts, filePath);

    console.log(`\nDone! ${allProducts.length} products saved to ${filePath}`);
  } finally {
    await context.close();
  }
}

main().catch(console.error);
