import path from "node:path";

function numEnv(key: string, fallback: number): number {
  const v = process.env[key];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v == null || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

export function loadConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const mixAnalysisId = process.env.MIX_ANALYSIS_ID;
  if (!mixAnalysisId) throw new Error("MIX_ANALYSIS_ID is required");

  const videoFile = process.env.VIDEO_FILE;
  if (!videoFile) throw new Error("VIDEO_FILE is required");

  const userDataDir = process.env.CHROME_USER_DATA_DIR;
  if (!userDataDir) {
    throw new Error(
      "CHROME_USER_DATA_DIR is required (dedicated Chrome profile; log in to YouTube once in headful mode).",
    );
  }

  return {
    databaseUrl,
    mixAnalysisId,
    videoFile: path.resolve(videoFile),
    userDataDir: path.resolve(userDataDir),
    headless: boolEnv("HEADLESS", true),
    contentIdWaitMs: numEnv("CONTENT_ID_WAIT_MS", 900_000),
  };
}
