import { createHash } from 'node:crypto';

/** Content hash for change detection: hash of normalized text. */
export function contentHash(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim().toLowerCase();
  return createHash('sha256').update(normalized).digest('hex');
}
