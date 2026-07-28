import Bottleneck from "bottleneck";
import { logger } from "./logger.js";

const minTime = Math.max(500, Number(process.env.NAV_MIN_INTERVAL_MS) || 2500);

/**
 * Serializes navigation and heavy UI actions to reduce bot-like bursts.
 */
export const ytNavigationLimiter = new Bottleneck({
  minTime,
  maxConcurrent: 1,
});

ytNavigationLimiter.on("failed", (error) => {
  logger.warn({ err: error }, "rateLimiter job failed");
});

export function scheduleYt<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return ytNavigationLimiter.schedule(async () => {
    const start = Date.now();
    try {
      const out = await fn();
      logger.debug({ label, ms: Date.now() - start }, "yt action done");
      return out;
    } catch (e) {
      logger.warn({ label, ms: Date.now() - start, err: e }, "yt action error");
      throw e;
    }
  });
}
