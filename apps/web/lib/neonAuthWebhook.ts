import crypto from 'node:crypto';

const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

export interface NeonAuthWebhookPayload {
  event_id: string;
  event_type: string;
  timestamp: string;
  context?: {
    endpoint_id?: string;
    project_name?: string;
  };
  user?: {
    id?: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
  };
  event_data?: Record<string, unknown>;
}

interface JsonWebKeySet {
  keys: Array<crypto.JsonWebKey & { kid?: string }>;
}

interface CachedJwks {
  expiresAt: number;
  keys: JsonWebKeySet['keys'];
}

const jwksCache = new Map<string, CachedJwks>();

function authBaseUrlFromEnvironment(): string | undefined {
  return (
    process.env.NEON_AUTH_BASE_URL?.trim() ||
    process.env.DATABASE_NEON_AUTH_BASE_URL?.trim()
  );
}

function requiredHeader(headers: Headers, name: string): string {
  const value = headers.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name} header.`);
  return value;
}

async function fetchJwks(
  baseUrl: string,
  fetcher: typeof fetch,
  forceRefresh: boolean,
): Promise<JsonWebKeySet['keys']> {
  const now = Date.now();
  const cached = jwksCache.get(baseUrl);
  if (!forceRefresh && cached && cached.expiresAt > now) return cached.keys;

  const response = await fetcher(
    `${baseUrl.replace(/\/$/u, '')}/.well-known/jwks.json`,
    { headers: { accept: 'application/json' }, cache: 'no-store' },
  );
  if (!response.ok) throw new Error('Neon Auth JWKS is unavailable.');
  const body = (await response.json()) as Partial<JsonWebKeySet>;
  if (!Array.isArray(body.keys)) throw new Error('Neon Auth JWKS is invalid.');

  jwksCache.set(baseUrl, {
    keys: body.keys,
    expiresAt: now + JWKS_CACHE_TTL_MS,
  });
  return body.keys;
}

export async function verifyNeonAuthWebhook(
  rawBody: string,
  headers: Headers,
  options: {
    baseUrl?: string;
    fetcher?: typeof fetch;
    now?: number;
  } = {},
): Promise<NeonAuthWebhookPayload> {
  const baseUrl = options.baseUrl?.trim() || authBaseUrlFromEnvironment();
  if (!baseUrl) throw new Error('Neon Auth webhook verification is not configured.');

  const signature = requiredHeader(headers, 'x-neon-signature');
  const kid = requiredHeader(headers, 'x-neon-signature-kid');
  const timestamp = requiredHeader(headers, 'x-neon-timestamp');
  const eventType = requiredHeader(headers, 'x-neon-event-type');
  const eventId = requiredHeader(headers, 'x-neon-event-id');
  const timestampMs = Number(timestamp);
  const now = options.now ?? Date.now();
  if (
    !Number.isSafeInteger(timestampMs) ||
    Math.abs(now - timestampMs) > MAX_TIMESTAMP_AGE_MS
  ) {
    throw new Error('Neon Auth webhook timestamp is invalid or stale.');
  }

  const [headerB64, emptyPayload, signatureB64, extra] = signature.split('.');
  if (!headerB64 || emptyPayload !== '' || !signatureB64 || extra !== undefined) {
    throw new Error('Neon Auth webhook signature format is invalid.');
  }

  let protectedHeader: { alg?: unknown; kid?: unknown };
  try {
    protectedHeader = JSON.parse(
      Buffer.from(headerB64, 'base64url').toString('utf8'),
    ) as { alg?: unknown; kid?: unknown };
  } catch {
    throw new Error('Neon Auth webhook signature header is invalid.');
  }
  if (protectedHeader.alg !== 'EdDSA' || protectedHeader.kid !== kid) {
    throw new Error('Neon Auth webhook signature header does not match.');
  }

  const fetcher = options.fetcher ?? fetch;
  let keys = await fetchJwks(baseUrl, fetcher, false);
  let jwk = keys.find((candidate) => candidate.kid === kid);
  if (!jwk) {
    keys = await fetchJwks(baseUrl, fetcher, true);
    jwk = keys.find((candidate) => candidate.kid === kid);
  }
  if (!jwk) throw new Error('Neon Auth webhook signing key is unknown.');

  const payloadB64 = Buffer.from(rawBody, 'utf8').toString('base64url');
  const signaturePayload = `${timestamp}.${payloadB64}`;
  const signaturePayloadB64 = Buffer.from(signaturePayload, 'utf8').toString(
    'base64url',
  );
  const signingInput = `${headerB64}.${signaturePayloadB64}`;
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const valid = crypto.verify(
    null,
    Buffer.from(signingInput),
    publicKey,
    Buffer.from(signatureB64, 'base64url'),
  );
  if (!valid) throw new Error('Neon Auth webhook signature is invalid.');

  let payload: NeonAuthWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as NeonAuthWebhookPayload;
  } catch {
    throw new Error('Neon Auth webhook payload is invalid JSON.');
  }
  if (
    payload.event_id !== eventId ||
    payload.event_type !== eventType ||
    typeof payload.timestamp !== 'string'
  ) {
    throw new Error('Neon Auth webhook headers do not match its payload.');
  }
  return payload;
}

export function clearNeonAuthJwksCacheForTests(): void {
  jwksCache.clear();
}
