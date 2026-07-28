# Enable Realtime on `games` (required for win pattern sync)

When the host changes the winning pattern (e.g. **Any line** → **X pattern**) in the dashboard or Kingz Control, the **player card** listens for Postgres updates on `public.games`. That only works if **Supabase Realtime** is turned on for that table.

Without Realtime, phones keep the **old** pattern until the player refreshes the page—so BINGO / X validation can look “broken” even though the server is correct.

## Steps (Supabase Dashboard)

1. Open your project: [Supabase Dashboard](https://supabase.com/dashboard) → your **LyricGrid** project.
2. Go to **Database** → **Replication** (or **Publication**, depending on UI version).
3. Find the **`supabase_realtime`** publication (or **Realtime** settings that list tables).
4. **Enable** the **`games`** table (schema `public`) for replication.
   - In newer UIs: **Project Settings** → **API** → scroll to **Realtime**; or **Database** → **Publications** → edit `supabase_realtime` and check **`games`**.
5. Save / apply. No app redeploy is required; clients reconnect on next load.

## Verify

- Open a **play** URL on two devices (or two browser tabs).
- Change **Winning pattern** on the host for that game.
- Within a second or two, the player UI should reflect the new pattern (BINGO rules update without refresh).

## Related code

- `app/play/PlayerCard.tsx` — `postgres_changes` on `public.games` with `filter: id=eq.{gameId}`.

If Realtime is disabled, that subscription never fires; enabling **`games`** fixes it.
