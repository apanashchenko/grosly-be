import { createHash } from 'crypto';

const CACHE_VERSION = 'v1';

/**
 * Generate a deterministic SHA-256 cache key from a prefix and input data.
 * Inputs are normalized (trimmed, lowercased strings; sorted arrays/objects)
 * to ensure identical logical inputs produce the same key.
 *
 * Format: ai:v1:prefix:hash
 */
export function generateCacheKey(prefix: string, ...parts: unknown[]): string {
  const normalized = parts.map((part) => normalizeForHash(part));
  const payload = stableStringify(normalized);
  const hash = createHash('sha256').update(payload).digest('hex');
  return `ai:${CACHE_VERSION}:${prefix}:${hash}`;
}

function normalizeForHash(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((v) => normalizeForHash(v))
      .sort((a, b) => {
        const sa = stableStringify(a);
        const sb = stableStringify(b);
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      });
  }

  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = normalizeForHash((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return JSON.stringify(value);
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map((v) => stableStringify(v)).join(',') + ']';
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(
      (k) => JSON.stringify(k) + ':' + stableStringify(obj[k]),
    );
    return '{' + pairs.join(',') + '}';
  }

  return JSON.stringify(value);
}
