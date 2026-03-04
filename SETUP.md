# Music Bingo – Setup

## 1. Install dependencies

```bash
npm install
```

## 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of **`supabase/schema.sql`**.
3. In **Database → Replication**, enable Realtime for: `games`, `played_songs`, `cards`.
4. Copy **`.env.local.example`** to **`.env.local`** and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Run the app

```bash
npm run dev
```

- **/** – Home (Host / Join)
- **/host** – Create game: paste playlist name + one YouTube link per line (min 25). Then you get a game link.
- **/host/[gameId]** – Host dashboard: share code, Start game, click “Play” next to a song to play a ~20s clip and mark it for all players.
- **/join** – Enter game code + display name (optional: platform username for BINGO in chat). Get your 5×5 card.
- **/play?cardId=…&gameId=…** – Your card; squares mark in real time when the host plays a song.

## 4. BINGO verification (Streamer.bot / multi-platform chat)

When a viewer types **BINGO** in chat, you can verify their card via the API.

**Option A – Streamer.bot “Make a request”**  
Create an Action that triggers on chat message containing “BINGO”, then:

- **Make a request**: `POST` to `https://your-app-url/api/verify-bingo`
- **Body (JSON)**: `{ "gameId": "<current-game-uuid>", "playerIdentifier": "{{user.Name}}" }`

Use the response to show “Valid BINGO!” or “No winning line” in your overlay/bot.

**Option B – Node script (optional)**  
To use the WebSocket script (e.g. if Streamer.bot exposes events over WebSocket):

```bash
npm install ws
BINGO_GAME_ID=<current-game-uuid> BINGO_VERIFY_URL=http://localhost:3000/api/verify-bingo node scripts/streamerbot-bingo-listener.js
```

Set `STREAMERBOT_WS_URL` if your WebSocket URL is different from `ws://127.0.0.1:8080/`.

## Tech stack

- **Frontend/backend**: Next.js (React), Tailwind CSS
- **Real-time DB**: Supabase (game state, cards, played songs)
- **Video**: YouTube IFrame API (15–20s clips)
- **Chat**: Use Streamer.bot or BotRix to combine Twitch, Kick, YouTube, TikTok, etc., and call `/api/verify-bingo` when someone says BINGO
