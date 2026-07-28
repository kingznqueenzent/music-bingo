import pg from "pg";
import { logger } from "./logger.js";
import { withRetry } from "./retry.js";

export type YoutubeTestRow = {
  mix_analysis_id: string;
  track_id?: string | null;
  test_kind: "shorts_clip" | "full_upload" | "content_id_simulation" | "metadata_only" | "other";
  youtube_video_id?: string | null;
  channel_id?: string | null;
  result: Record<string, unknown>;
  notes?: string | null;
};

export function createPool(connectionString: string) {
  return new pg.Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });
}

export async function insertYoutubeTest(pool: pg.Pool, row: YoutubeTestRow): Promise<string> {
  const sql = `
    insert into public.youtube_tests (
      mix_analysis_id,
      track_id,
      test_kind,
      youtube_video_id,
      channel_id,
      result,
      notes
    ) values ($1, $2, $3, $4, $5, $6::jsonb, $7)
    returning id
  `;
  const values = [
    row.mix_analysis_id,
    row.track_id ?? null,
    row.test_kind,
    row.youtube_video_id ?? null,
    row.channel_id ?? null,
    JSON.stringify(row.result),
    row.notes ?? null,
  ];

  return withRetry(
    async () => {
      const res = await pool.query(sql, values);
      const id = res.rows[0]?.id as string;
      if (!id) throw new Error("insert returned no id");
      logger.info({ youtubeTestId: id }, "stored youtube_tests row");
      return id;
    },
    { label: "postgres.insertYoutubeTest", retries: 4, baseMs: 1500 },
  );
}
