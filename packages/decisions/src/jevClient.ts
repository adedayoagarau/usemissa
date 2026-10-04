import type { DataClass, JevQuestion, JevResponse, JevState } from "./types.js";

export const JEV_DEFAULT_BASE_URL = "https://thejevai.com";
export const JEV_DEFAULT_MODEL = "jev-latest";

export interface JevClientOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Set only once a no-retention agreement covers creator-private data. */
  allowCreatorPrivateData?: boolean;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class JevError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "JevError";
  }
}

export interface JevClient {
  /** False when no API key is configured; callers record nothing and fall back. */
  readonly available: boolean;
  readonly model: string;
  canSend(dataClass: DataClass): boolean;
  evaluate(
    state: JevState,
    questions: Record<string, JevQuestion>,
  ): Promise<JevResponse>;
}

const RETRYABLE_STATUS = new Set([429, 529, 500, 502, 503, 504]);

export function createJevClient(options: JevClientOptions = {}): JevClient {
  const apiKey = options.apiKey?.trim() || null;
  const baseUrl = (options.baseUrl ?? JEV_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model ?? JEV_DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRetries = options.maxRetries ?? 3;
  const doFetch = options.fetch ?? globalThis.fetch;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  function canSend(dataClass: DataClass) {
    return (
      dataClass !== "creator-private" ||
      options.allowCreatorPrivateData === true
    );
  }

  async function evaluate(
    state: JevState,
    questions: Record<string, JevQuestion>,
  ): Promise<JevResponse> {
    if (!apiKey)
      throw new JevError(
        "Jev is not configured: JEV_API_KEY is missing",
        null,
        false,
      );
    if (Object.keys(questions).length === 0) {
      return { model, answers: {} };
    }
    const body = JSON.stringify({ state, model, questions });

    let attempt = 0;
    for (;;) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await doFetch(`${baseUrl}/v1/systemone`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body,
          signal: controller.signal,
        });
        if (response.ok) {
          const parsed = (await response.json()) as JevResponse;
          if (
            !parsed ||
            typeof parsed !== "object" ||
            typeof parsed.answers !== "object"
          ) {
            throw new JevError(
              "Jev returned a response without answers",
              response.status,
              false,
            );
          }
          return parsed;
        }
        const detail = await response.text().catch(() => "");
        throw new JevError(
          `Jev request failed with ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
          response.status,
          RETRYABLE_STATUS.has(response.status),
        );
      } catch (error) {
        const jevError =
          error instanceof JevError
            ? error
            : new JevError(
                `Jev request failed: ${error instanceof Error ? error.message : String(error)}`,
                null,
                true,
              );
        if (!jevError.retryable || attempt >= maxRetries) throw jevError;
        attempt += 1;
        await sleep(Math.min(8_000, 500 * 2 ** (attempt - 1)));
      } finally {
        clearTimeout(timer);
      }
    }
  }

  return { available: apiKey !== null, model, canSend, evaluate };
}

/**
 * Reads JEV_API_KEY, JEV_BASE_URL, JEV_MODEL, JEV_TIMEOUT_MS and
 * JEV_ALLOW_CREATOR_PRIVATE_DATA ("1" only after a no-retention agreement).
 */
export function jevClientFromEnv(
  env: Record<string, string | undefined> = process.env,
  overrides: Partial<JevClientOptions> = {},
): JevClient {
  const timeout = Number(env.JEV_TIMEOUT_MS);
  return createJevClient({
    apiKey: env.JEV_API_KEY,
    baseUrl: env.JEV_BASE_URL || undefined,
    model: env.JEV_MODEL || undefined,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : undefined,
    allowCreatorPrivateData: env.JEV_ALLOW_CREATOR_PRIVATE_DATA === "1",
    ...overrides,
  });
}
