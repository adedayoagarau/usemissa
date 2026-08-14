import { createHash, createHmac } from "node:crypto";

/**
 * Snapshot bodies are large, immutable, and content-addressed. Postgres is the
 * wrong storage class for them: they inflate branch and backup cost and sit in
 * the same table the run-history queries join across.
 *
 * A body store keeps bodies outside Postgres and keys them by content hash, so
 * an unchanged page costs nothing to re-observe. Postgres keeps the hash and the
 * metadata; the hash is the join.
 */
export interface SnapshotBodyStore {
  readonly id: string;
  /** Returns true when the body was newly written, false when the hash already existed. */
  put(contentHash: string, body: string, contentType?: string | null): Promise<boolean>;
  get(contentHash: string): Promise<string | undefined>;
  has(contentHash: string): Promise<boolean>;
}

/** Default: bodies stay in Postgres. Preserves the existing behaviour exactly. */
export class InlineSnapshotBodyStore implements SnapshotBodyStore {
  readonly id = "inline";
  async put(): Promise<boolean> { return true; }
  async get(): Promise<string | undefined> { return undefined; }
  async has(): Promise<boolean> { return false; }
}

export class MemorySnapshotBodyStore implements SnapshotBodyStore {
  readonly id = "memory";
  private readonly bodies = new Map<string, string>();
  async put(contentHash: string, body: string): Promise<boolean> {
    if (this.bodies.has(contentHash)) return false;
    this.bodies.set(contentHash, body);
    return true;
  }
  async get(contentHash: string): Promise<string | undefined> { return this.bodies.get(contentHash); }
  async has(contentHash: string): Promise<boolean> { return this.bodies.has(contentHash); }
  size(): number { return this.bodies.size; }
}

export interface R2SnapshotBodyStoreOptions {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const SERVICE = "s3";
const REGION = "auto";

function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function amzDate(now: Date): { amz: string; date: string } {
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amz, date: amz.slice(0, 8) };
}

/**
 * Cloudflare R2 over its S3-compatible API, signed with SigV4 by hand.
 *
 * Signing inline avoids pulling the AWS SDK (tens of megabytes) into a worker
 * image that only ever performs three operations against one bucket.
 */
export class R2SnapshotBodyStore implements SnapshotBodyStore {
  readonly id = "r2";
  private readonly endpoint: string;
  private readonly prefix: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: R2SnapshotBodyStoreOptions) {
    if (!options.accountId || !options.bucket || !options.accessKeyId || !options.secretAccessKey) {
      throw new Error("R2 snapshot storage requires accountId, bucket, accessKeyId, and secretAccessKey");
    }
    this.endpoint = (options.endpoint ?? `https://${options.accountId}.r2.cloudflarestorage.com`).replace(/\/$/, "");
    this.prefix = (options.prefix ?? "snapshots").replace(/^\/|\/$/g, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  /** Content-addressed and fanned out, so no single prefix accumulates every object. */
  key(contentHash: string): string {
    return `${this.prefix}/${contentHash.slice(0, 2)}/${contentHash.slice(2, 4)}/${contentHash}`;
  }

  async put(contentHash: string, body: string, contentType?: string | null): Promise<boolean> {
    if (await this.has(contentHash)) return false;
    const response = await this.send("PUT", this.key(contentHash), body, contentType ?? "text/html; charset=utf-8");
    if (!response.ok) throw new Error(`R2 snapshot put failed with HTTP ${response.status}`);
    return true;
  }

  async get(contentHash: string): Promise<string | undefined> {
    const response = await this.send("GET", this.key(contentHash));
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`R2 snapshot get failed with HTTP ${response.status}`);
    return response.text();
  }

  async has(contentHash: string): Promise<boolean> {
    const response = await this.send("HEAD", this.key(contentHash));
    if (response.status === 404) return false;
    if (!response.ok) throw new Error(`R2 snapshot head failed with HTTP ${response.status}`);
    return true;
  }

  private async send(method: "GET" | "PUT" | "HEAD", key: string, body?: string, contentType?: string): Promise<Response> {
    const url = new URL(`${this.endpoint}/${this.options.bucket}/${key}`);
    const payloadHash = sha256Hex(body ?? "");
    const { amz, date } = amzDate(new Date());
    const headers: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amz,
    };
    if (contentType) headers["content-type"] = contentType;

    const signedHeaders = Object.keys(headers).sort();
    const canonicalHeaders = signedHeaders.map((name) => `${name}:${headers[name]}\n`).join("");
    const canonicalRequest = [
      method,
      url.pathname.split("/").map((segment) => encodeURIComponent(decodeURIComponent(segment))).join("/"),
      "",
      canonicalHeaders,
      signedHeaders.join(";"),
      payloadHash,
    ].join("\n");

    const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amz, scope, sha256Hex(canonicalRequest)].join("\n");
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${this.options.secretAccessKey}`, date), REGION), SERVICE), "aws4_request");
    const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.options.accessKeyId}/${scope}, SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`;

    return this.fetchImpl(url.href, {
      method,
      headers,
      ...(body === undefined ? {} : { body }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}

/**
 * Bodies move out of Postgres only when R2 is fully configured. A partial
 * configuration is a deployment mistake, not a reason to silently keep writing
 * multi-megabyte rows, so it throws rather than degrading.
 */
export function createSnapshotBodyStore(env: NodeJS.ProcessEnv = process.env): SnapshotBodyStore {
  const configured = [env.R2_ACCOUNT_ID, env.R2_SNAPSHOT_BUCKET, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY];
  if (configured.every((value) => !value)) return new InlineSnapshotBodyStore();
  if (configured.some((value) => !value)) {
    throw new Error("R2 snapshot storage is partially configured; set R2_ACCOUNT_ID, R2_SNAPSHOT_BUCKET, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY together");
  }
  return new R2SnapshotBodyStore({
    accountId: env.R2_ACCOUNT_ID!,
    bucket: env.R2_SNAPSHOT_BUCKET!,
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    ...(env.R2_SNAPSHOT_PREFIX ? { prefix: env.R2_SNAPSHOT_PREFIX } : {}),
    ...(env.R2_ENDPOINT ? { endpoint: env.R2_ENDPOINT } : {}),
  });
}
