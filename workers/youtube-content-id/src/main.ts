/**
 * Puppeteer worker: private test upload → wait for checks / Content ID–related UI → scrape → PostgreSQL.
 *
 * Warnings:
 * - Automating YouTube may violate the YouTube Terms of Service. Use only on channels you own,
 *   for permitted testing, with isolated credentials and minimal rate.
 * - Studio DOM and flows change often; maintain selectors/heuristics locally.
 * - Content ID outcomes are not fully exposed in the UI for all cases; this captures best-effort text.
 */

import "dotenv/config";
import fs from "node:fs";
import { loadConfig } from "./config.js";
import { createPool, insertYoutubeTest } from "./db.js";
import { childLogger, logger } from "./logger.js";
import { launchBrowser, runUploadAndExtract } from "./youtubeFlow.js";

async function main() {
  const cfg = loadConfig();
  if (!fs.existsSync(cfg.videoFile)) {
    throw new Error(`VIDEO_FILE not found: ${cfg.videoFile}`);
  }

  const log = childLogger({ mixAnalysisId: cfg.mixAnalysisId });
  log.info(
    { videoFile: cfg.videoFile, headless: cfg.headless },
    "starting YouTube Content ID worker run",
  );

  const pool = createPool(cfg.databaseUrl);
  const browser = await launchBrowser(cfg.userDataDir, cfg.headless);

  try {
    const flow = await runUploadAndExtract(browser, cfg.videoFile, cfg.contentIdWaitMs, log);

    const trackId = process.env.TRACK_ID?.trim() || null;

    await insertYoutubeTest(pool, {
      mix_analysis_id: cfg.mixAnalysisId,
      track_id: trackId,
      test_kind: "full_upload",
      youtube_video_id: flow.videoId,
      channel_id: flow.channelId,
      result: {
        ...flow,
        scrapedAt: new Date().toISOString(),
      },
      notes:
        flow.scan.phase === "timeout"
          ? "Timed out waiting for checks/copyright UI; increase CONTENT_ID_WAIT_MS or adjust heuristics."
          : flow.videoId
            ? null
            : "video id not parsed from URL; confirm upload completed and URL pattern.",
    });

    log.info({ videoId: flow.videoId, scanPhase: flow.scan.phase }, "run finished and row stored");
  } finally {
    await browser.close();
    await pool.end();
  }
}

main().catch((e) => {
  logger.fatal({ err: e }, "worker failed");
  process.exit(1);
});
