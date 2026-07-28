import { logger } from "./logger.js";

export type RetryOptions = {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  label?: string;
};

function numEnv(key: string, fallback: number): number {
  const v = process.env[key];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Exponential backoff with jitter. Retries on any thrown error.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? numEnv("ACTION_RETRIES", 5);
  const baseMs = opts.baseMs ?? numEnv("ACTION_RETRY_BASE_MS", 2000);
  const maxMs = opts.maxMs ?? 60_000;
  const label = opts.label ?? "operation";

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === retries) break;
      const exp = Math.min(maxMs, baseMs * 2 ** attempt);
      const jitter = Math.floor(Math.random() * 500);
      const wait = exp + jitter;
      logger.warn(
        { label, attempt: attempt + 1, maxAttempts: retries + 1, waitMs: wait, err: String(e) },
        "retry after failure",
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}
