# Music Bingo – What’s Left & Roadmap

## What’s needed to “complete” the app

You already have a solid **MVP**. To make it production-ready and more business-ready:

| Area | Status | Next steps |
|------|--------|------------|
| **Verification speed** | Basic (API + manual Master Board) | Optimize verify API; optional: WebSocket so host gets instant “BINGO from @user” in dashboard. |
| **Video support** | YouTube + Media Library (Pro+) | Already there; optional: better crossfade, preview thumbnails. |
| **Auth** | None (anon) | Add Supabase Auth or NextAuth so hosts have accounts, saved games, and tier is per-account. |
| **Leaderboard** | DB table only, no UI | Add Leaderboard page and wire wins (see below). |
| **Prizes** | Not implemented | Add prizes per game + assign to winners (see below). |
| **Chat integration** | Streamer.bot script exists | Optional: in-app “recent BINGO claims” list; tighter Streamer.bot docs. |
| **Payments** | Not implemented | Stripe (or similar) for Pro/Enterprise; enforce tier limits by account. |

---

## Prizes and leaderboard (eventually)

### Prizes

- **Concept:** Host defines 1–3 prizes per game (e.g. “1st: $10 gift card”, “2nd: shoutout”).
- **Schema:** `prizes` table: `game_id`, `rank` (1/2/3), `label`, optional `image_url` / `claim_url`.
- **Flow:** When a player’s BINGO is verified, host (or system) assigns a prize to that win; winner can see “You won: …” on their card or a winners page.
- **Optional:** “Claim” flow (link, code, or form) for physical/digital rewards.

### Leaderboard stats (more than wins)

- **Today:** `wins` table has `game_id`, `card_id`, `player_identifier`, `mode`, `round`, `created_at`. No UI yet.
- **Add:**
  - **Record a win** when verification succeeds (insert into `wins` with `player_identifier` from card).
  - **Leaderboard page** with:
    - **This game:** Top N by order of win (1st, 2nd, 3rd) + optional prize labels.
    - **Session / event:** All games in a “session” (e.g. same host or event tag) – total wins per player.
    - **All-time (optional):** Wins per `player_identifier` across games (for “global leaderboard”).
  - **Extra stats:** Streaks (e.g. wins in a row), “first bingo” per game, number of games played (if you track joins).

### Suggested order

1. **Record wins** – Done. When verify-bingo returns valid, the API now inserts into `wins` (game, card, player_identifier, mode, round).
2. **Leaderboard page** – Per-game and “recent games” leaderboard using `wins`.
3. **Prizes table + host UI** – Host sets prizes for a game; when a win is recorded, assign prize by rank.
4. **Winner experience** – Show “You won: [prize]” and optional claim flow.
5. **Richer stats** – Streaks, all-time, badges (e.g. “First bingo”, “Blackout master”) in a later phase.

This doc and the optional migration below give you a clear path to add prizes and leaderboard stats when you’re ready.
