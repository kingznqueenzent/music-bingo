/**
 * YouTube Studio UI automation. Copy, selectors, and wizard steps change without notice.
 * Expect to adjust heuristics (text matches, waits) for your locale and account type.
 */

import type { Browser, ElementHandle, Page } from "puppeteer";
import puppeteer from "puppeteer";
import type { Logger } from "pino";
import { scheduleYt } from "./rateLimiter.js";
import { withRetry } from "./retry.js";

export type FlowResult = {
  videoId: string | null;
  channelId: string | null;
  pageUrl: string;
  copyright: {
    claims: Array<Record<string, string>>;
    extractionNotes: string[];
  };
  scan: { phase: string; waitedMs: number };
};

export async function launchBrowser(userDataDir: string, headless: boolean): Promise<Browser> {
  return puppeteer.launch({
    headless: headless ? true : false,
    userDataDir,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1400,900",
    ],
    defaultViewport: headless ? { width: 1280, height: 800 } : null,
  });
}

async function findVideoFileInput(page: Page): Promise<ElementHandle<HTMLInputElement> | null> {
  const handle = await page.evaluateHandle(() => {
    const walk = (root: Document | ShadowRoot): HTMLInputElement | null => {
      for (const el of root.querySelectorAll("input[type=file]")) {
        if (!(el instanceof HTMLInputElement)) continue;
        const acc = el.getAttribute("accept") ?? "";
        if (!acc || acc.includes("video") || acc.includes("audio") || acc.includes("*")) {
          return el;
        }
      }
      for (const n of root.querySelectorAll("*")) {
        const sh = (n as HTMLElement).shadowRoot;
        if (sh) {
          const hit = walk(sh);
          if (hit) return hit;
        }
      }
      return null;
    };
    return walk(document);
  });
  const el = handle.asElement();
  if (!el) return null;
  return el as ElementHandle<HTMLInputElement>;
}

async function gotoStudio(page: Page) {
  await withRetry(
    () =>
      scheduleYt("goto studio", () =>
        page.goto("https://studio.youtube.com", {
          waitUntil: "networkidle2",
          timeout: 120_000,
        }),
      ),
    { label: "gotoStudio", retries: 6, baseMs: 3000 },
  );
}

async function uploadVideoPath(page: Page, absPath: string, log: Logger) {
  await gotoStudio(page);
  await new Promise((r) => setTimeout(r, 2500));

  const input = await withRetry(
    async () => {
      const h = await findVideoFileInput(page);
      if (!h) throw new Error("video file input not found (Studio may have changed)");
      return h;
    },
    { label: "findFileInput", retries: 10, baseMs: 4000 },
  );

  await scheduleYt("uploadFile", () => input.uploadFile(absPath));
  log.info("submitted file via Studio file input");
}

async function clickByExactText(page: Page, text: string): Promise<boolean> {
  return page.evaluate((t) => {
    const nodes = document.querySelectorAll("*");
    for (const n of nodes) {
      if (n.childNodes.length === 0 && n.textContent?.trim() === t) {
        (n as HTMLElement).click();
        return true;
      }
      if (n.textContent?.trim() === t && n instanceof HTMLElement) {
        n.click();
        return true;
      }
    }
    return false;
  }, text);
}

async function trySetPrivate(page: Page, log: Logger) {
  await scheduleYt("visibility private", async () => {
    const ok =
      (await clickByExactText(page, "Private")) ||
      (await page.evaluate(() => {
        const labels = ["Private", "非公開", "Privado", "Privé"];
        const all = document.querySelectorAll("*");
        for (const n of all) {
          const s = n.textContent?.trim();
          if (s && labels.includes(s)) {
            (n as HTMLElement).click();
            return true;
          }
        }
        return false;
      }));
    if (ok) log.info("selected Private visibility (heuristic)");
    else log.warn("could not select Private — set default upload visibility in YT settings or finish wizard manually once");
  });
}

const WIZARD_NEXT_LABELS = ["Next", "NEXT", "Continue", "Done", "Save", "Publish", "公開", "次へ"];

async function tryWizardAdvance(page: Page, log: Logger) {
  await scheduleYt("wizard advance", async () => {
    for (const label of WIZARD_NEXT_LABELS) {
      if (await clickByExactText(page, label)) {
        log.info({ label }, "wizard control clicked");
        await new Promise((r) => setTimeout(r, 2500));
        return;
      }
    }
  });
}

async function pollProcessing(page: Page, maxWaitMs: number, log: Logger) {
  const start = Date.now();
  const interval = 12_000;
  while (Date.now() - start < maxWaitMs) {
    const text = await page.evaluate(() => document.body?.innerText ?? "");
    const lowered = text.toLowerCase();
    const hitCopyright =
      lowered.includes("copyright") ||
      lowered.includes("content id") ||
      lowered.includes("matched third party") ||
      lowered.includes("third-party");
    const checksDone =
      lowered.includes("checks complete") ||
      lowered.includes("no issues found") ||
      lowered.includes("issue found") ||
      lowered.includes("ad suitability");
    if (hitCopyright) {
      log.info({ waitedMs: Date.now() - start }, "copyright-related copy detected");
      return { phase: "copyright_signal", waitedMs: Date.now() - start };
    }
    if (checksDone) {
      log.info({ waitedMs: Date.now() - start }, "checks / suitability UI signal");
      return { phase: "checks_signal", waitedMs: Date.now() - start };
    }
    log.debug({ waitedMs: Date.now() - start }, "waiting for checks / copyright UI");
    await new Promise((r) => setTimeout(r, interval));
  }
  return { phase: "timeout", waitedMs: Date.now() - start };
}

async function extractVideoId(page: Page): Promise<string | null> {
  const url = page.url();
  const m =
    url.match(/\/video\/([a-zA-Z0-9_-]{11})\//) ??
    url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ??
    url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

async function extractChannelId(page: Page): Promise<string | null> {
  const url = page.url();
  const m = url.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  return m?.[1] ?? null;
}

function extractClaimsFromDom(): { claims: Array<Record<string, string>>; notes: string[] } {
  const notes: string[] = [];
  const claims: Array<Record<string, string>> = [];
  const body = document.body?.innerText ?? "";
  const blocks = body
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const b of blocks) {
    const l = b.toLowerCase();
    if (
      l.includes("copyright") &&
      (l.includes("claim") || l.includes("content id") || l.includes("matched") || l.includes("song"))
    ) {
      claims.push({ raw: b.slice(0, 2000) });
    }
  }
  if (claims.length === 0) {
    notes.push(
      "No copyright claim blocks heuristically parsed; review video in Studio or extend DOM selectors.",
    );
  }
  return { claims, notes };
}

export async function runUploadAndExtract(
  browser: Browser,
  videoPath: string,
  contentIdWaitMs: number,
  log: Logger,
): Promise<FlowResult> {
  const page = await browser.newPage();
  page.setDefaultTimeout(120_000);
  try {
    await uploadVideoPath(page, videoPath, log);

    for (let i = 0; i < 8; i++) {
      await trySetPrivate(page, log);
      await tryWizardAdvance(page, log);
    }

    const scan = await pollProcessing(page, contentIdWaitMs, log);
    const videoId = await extractVideoId(page);
    const channelId = await extractChannelId(page);
    const copyright = await page.evaluate(extractClaimsFromDom);
    const pageUrl = page.url();

    return {
      videoId,
      channelId,
      pageUrl,
      copyright: {
        claims: copyright.claims,
        extractionNotes: copyright.notes,
      },
      scan: { phase: scan.phase, waitedMs: scan.waitedMs },
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}
