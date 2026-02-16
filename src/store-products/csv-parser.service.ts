import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export interface ParsedCsvRow {
  name: string;
  price: number;
  oldPrice: number | null;
  quantity: number | null;
  unit: string;
  category: string;
}

export interface CsvParseResult {
  rows: ParsedCsvRow[];
  errors: string[];
}

const REQUIRED_COLUMNS = ['name', 'price', 'unit', 'category'];

@Injectable()
export class CsvParserService {
  parse(buffer: Buffer): CsvParseResult {
    const content = this.stripBom(buffer.toString('utf-8'));

    const delimiter = this.detectDelimiter(content);

    let records: Record<string, string>[];
    try {
      records = parse(content, {
        columns: true,
        delimiter,
        trim: true,
        skip_empty_lines: true,
        relax_column_count: true,
      }) as Record<string, string>[];
    } catch {
      throw new BadRequestException(
        'Failed to parse CSV file. Ensure it is a valid UTF-8 CSV with headers.',
      );
    }

    if (records.length === 0) {
      throw new BadRequestException('CSV file is empty (no data rows)');
    }

    const headers = Object.keys(records[0]);
    const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required CSV columns: ${missing.join(', ')}. Found: ${headers.join(', ')}`,
      );
    }

    const rows: ParsedCsvRow[] = [];
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 for header row + 0-index

      const name = record['name']?.trim();
      const priceStr = record['price']?.trim();
      const unit = record['unit']?.trim();
      const category = record['category']?.trim();

      if (!name) {
        errors.push(`Row ${rowNum}: missing name`);
        continue;
      }
      if (!priceStr) {
        errors.push(`Row ${rowNum}: missing price`);
        continue;
      }
      if (!unit) {
        errors.push(`Row ${rowNum}: missing unit`);
        continue;
      }
      if (!category) {
        errors.push(`Row ${rowNum}: missing category`);
        continue;
      }

      const price = parseFloat(priceStr.replace(',', '.'));
      if (isNaN(price) || price < 0) {
        errors.push(`Row ${rowNum}: invalid price "${priceStr}"`);
        continue;
      }

      const oldPriceStr = record['oldPrice']?.trim();
      let oldPrice: number | null = null;
      if (oldPriceStr) {
        const parsed = parseFloat(oldPriceStr.replace(',', '.'));
        if (!isNaN(parsed) && parsed >= 0) {
          oldPrice = parsed;
        }
      }

      const quantityStr = record['quantity']?.trim();
      let quantity: number | null = null;
      if (quantityStr) {
        const parsed = parseFloat(quantityStr.replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
          quantity = parsed;
        }
      }

      rows.push({ name, price, oldPrice, quantity, unit, category });
    }

    return { rows, errors };
  }

  private stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }

  private detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0] || '';
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    return semicolons > commas ? ';' : ',';
  }
}
