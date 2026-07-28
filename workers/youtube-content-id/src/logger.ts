import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

export const logger = pino({
  level,
  base: { service: "youtube-content-id-worker" },
});

export function childLogger(bindings: Record<string, string | undefined>) {
  return logger.child(bindings);
}
