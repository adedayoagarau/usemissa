import { createHmac, timingSafeEqual } from 'node:crypto';
import { sessionSecret } from '@/lib/auth';
import type { ImportMapping } from '@missa/radar-engine';

export interface TrackerImportPreviewToken {
  v: 1;
  userId: string;
  sourceHash: string;
  mappingHash: string;
  candidateHash: string;
  trackerHash: string;
  exp: number;
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function stableMappingHash(mapping: ImportMapping): string {
  return JSON.stringify(Object.keys(mapping).sort().map((key) => [key, mapping[key as keyof ImportMapping]]));
}

export function signTrackerImportPreviewToken(payload: TrackerImportPreviewToken): string {
  const body = encode(JSON.stringify(payload));
  const signature = createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyTrackerImportPreviewToken(token: string): TrackerImportPreviewToken | undefined {
  const [body, signature] = token.split('.');
  if (!body || !signature) return undefined;
  try {
    const expected = createHmac('sha256', sessionSecret()).update(body).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined;
    const payload = JSON.parse(decode(body)) as TrackerImportPreviewToken;
    if (payload.v !== 1 || typeof payload.userId !== 'string' || typeof payload.sourceHash !== 'string' || typeof payload.mappingHash !== 'string' || typeof payload.candidateHash !== 'string' || typeof payload.trackerHash !== 'string' || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return undefined;
    return payload;
  } catch {
    return undefined;
  }
}
