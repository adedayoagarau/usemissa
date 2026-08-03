import { createPublicKey, createVerify } from 'node:crypto';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const CERT_CACHE_MS = 60 * 60_000;
const MAX_TOKEN_LENGTH = 16_000;

type JsonRecord = Record<string, unknown>;
type CertificateCache = { expiresAt: number; keys: Record<string, string> };
let certificateCache: CertificateCache | undefined;

function record(value: unknown): JsonRecord { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}; }
function text(value: unknown): string | undefined { return typeof value === 'string' && value ? value : undefined; }
function decode(value: string): string { return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); }
function decodeJson(value: string): JsonRecord { try { return record(JSON.parse(decode(value))); } catch { return {}; } }
function bearer(value: string | null): string | undefined { const match = /^Bearer\s+([^\s]+)$/i.exec(value || ''); return match?.[1]; }

async function googleCertificates(fetcher: typeof fetch): Promise<Record<string, string>> {
  if (certificateCache && certificateCache.expiresAt > Date.now()) return certificateCache.keys;
  const response = await fetcher(GOOGLE_CERTS_URL, { signal: AbortSignal.timeout(5_000), headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('google_oidc_certs_unavailable');
  const body = record(await response.json().catch(() => ({})));
  const keys = Object.fromEntries(Object.entries(body).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
  if (!Object.keys(keys).length) throw new Error('google_oidc_certs_invalid');
  certificateCache = { keys, expiresAt: Date.now() + CERT_CACHE_MS };
  return keys;
}

export interface GooglePubSubOidcClaims { issuer: string; audience: string; subject?: string; email?: string; issuedAt: number; expiresAt: number; }

/** Verify the Google-signed OIDC token sent by authenticated Pub/Sub push. */
export async function verifyGooglePubSubOidc(
  authorization: string | null,
  expectedAudience: string,
  expectedEmail?: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<GooglePubSubOidcClaims | undefined> {
  const token = bearer(authorization);
  if (!token || token.length > MAX_TOKEN_LENGTH || !expectedAudience) return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  const header = decodeJson(parts[0]!);
  const claims = decodeJson(parts[1]!);
  if (header.alg !== 'RS256' || !text(header.kid)) return undefined;
  const issuer = text(claims.iss);
  const audience = text(claims.aud);
  const subject = text(claims.sub);
  const email = text(claims.email);
  const issuedAt = Number(claims.iat);
  const expiresAt = Number(claims.exp);
  const nowSeconds = Math.floor(now / 1_000);
  if (!issuer || !['https://accounts.google.com', 'accounts.google.com'].includes(issuer) || audience !== expectedAudience || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= nowSeconds || issuedAt > nowSeconds + 120) return undefined;
  if (expectedEmail && email?.toLowerCase() !== expectedEmail.toLowerCase()) return undefined;
  try {
    const keys = await googleCertificates(fetcher);
    const pem = keys[text(header.kid)!];
    if (!pem) return undefined;
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    const signature = Buffer.from(parts[2]!.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (!verifier.verify(createPublicKey({ key: pem, format: 'pem' }), signature)) return undefined;
    return { issuer, audience, ...(subject ? { subject } : {}), ...(email ? { email } : {}), issuedAt, expiresAt };
  } catch {
    return undefined;
  }
}

export function clearGooglePubSubCertificateCache(): void { certificateCache = undefined; }
