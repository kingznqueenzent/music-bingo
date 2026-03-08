# LyricGrid – How the Game Looks & Feels

Quick reference for the **player flow**, **bingo cards**, **stage view**, and **animations**.

---

## 1. Home & Join

- **Home** (`/`): Dark gradient (slate-950 → slate-900), LyricGrid logo (cyan/teal), hero title “Music Bingo for Livestreams”, buttons: Join a Game, Browse Playlists, Leaderboard. Stats: 100+ players, 25 tracks per card.
- **Join** (`/join`): Same dark theme. Form: **Game Code**, **Display Name**, optional **Platform username** (Twitch/Kick/YouTube). Button: “Get My Bingo Card”. Submit → creates a card and redirects to `/play?cardId=…&gameId=…`.

---

## 2. Player Bingo Card (`/play`)

- **Layout**: “Your Bingo Card” title (cyan gradient), optional game logo top-right, player name below. One **grid** (4×4 or 5×5) of squares.
- **Each square**:
  - Optional small **album art** (if `album_art_url`), then **song title** (or YouTube ID / “—”).
  - **Unmarked**: dark bg `#1E1E1E`, border `white/20`, text slate-300.
  - **Marked** (when that song has been played): border **cyan** `#00FFFF`, cyan text, **pulse-glow** animation (soft cyan box-shadow breathing).
- **Copy**: “When you get N in a row (horizontal, vertical, or diagonal), type **BINGO** in chat!”
- **Leaderboard**: Floating **trophy** button (bottom-right). Opens a bottom drawer: “Top 10 All-Time” with rank, name, points, wins.
- **Win**: When host verifies BINGO, a **modal** appears: “BINGO VERIFIED!”, “Enter your name to join the Leaderboard”, input + “Join Leaderboard” / “Skip”.

**Animations**: Marked cells use `animate-pulse-glow` (2s ease-in-out). Optional “pop” when a cell becomes marked (see globals.css / PlayerCard).

---

## 3. Stage View (`/stage/[gameId]`)

- **Full-screen** dark `#121212`. For **host/stream** – what players see on stream.
- **Top bar**: Source badge (YouTube / Spotify / Local), **Now Playing** title (large, Inter), “Spotify” subtitle when applicable.
- **Center**: Optional **album art** (rounded), then:
  - **YouTube**: `YouTubeClipPlayer` in a 16:9 area (clip plays with clip length + crossfade).
  - **Spotify**: `SpotifyEmbed` (track widget).
  - **Local**: `<video>` or `<audio>` for MP4/MP3.
- **Idle**: “No track selected” in a dark box.
- **Leaderboard overlay**: If host toggles “Show Leaderboard on Stage”, a **glassmorphism** overlay (blur + dark tint) shows “LyricGrid – LEADERBOARD” and top 10 (rank, name, points, wins). Last updated time at bottom.

**Transitions**: Opacity/pointer-events for leaderboard (duration-500). Song changes are instant (key on song id for video/audio).

---

## 4. Host Control Panel (`/host/[gameId]`)

- **Header**: LyricGrid logo, “Host Control”. Game **code** (e.g. 9GE6NN), QR code to join.
- **Actions**: “Start game”, “Open Stage View”, “View Leaderboard”. Toggle: “Show Leaderboard on Stage View”. Player count (and tier limit).
- **Print**: “Print mode” – 2 or 4 cards per page, “Download cards PDF”.
- **Playback**: “Now playing” (current song title), “Play next” list (upcoming songs). Buttons to play next song. Clip length / crossfade shown.
- **Verify BINGO**: Input “Card ID or player identifier”, “Verify BINGO” – on success, that player’s device shows the win modal and can claim leaderboard.

**Style**: Rounded panels (slate-800/900 borders), emerald for primary actions, cyan for LyricGrid/brand.

---

## 5. Animations (current)

| Where            | What                         | How |
|------------------|------------------------------|-----|
| Bingo card cell  | Marked state                 | `animate-pulse-glow` (cyan glow 2s loop) |
| Bingo card cell  | Just marked (optional)       | Pop/scale (see globals.css) |
| Win modal        | Open                         | Backdrop blur, modal scale-in (optional) |
| Stage leaderboard| Toggle                       | `transition-all duration-500` opacity |
| Buttons (global) | Hover                        | `hover:scale-105` or `hover:scale-[1.02]` |

---

## 6. Gameplay flow (feel)

1. **Host** creates game from Media Library or YouTube links → gets game code and host URL.
2. **Players** go to `/join`, enter code + name → “Get My Bingo Card” → land on `/play` with a unique card.
3. **Host** opens Stage View (e.g. OBS browser source), starts game, clicks “Play next” for each song. Clips play (YouTube/Spotify/local) with configurable clip length and crossfade.
4. **Players** see squares **mark automatically** when that song is played (realtime via Supabase). Marked cells get cyan border + pulse-glow.
5. When a player has a full line (or required pattern), they type **BINGO** in chat. Host enters their card ID/identifier and clicks **Verify BINGO**.
6. **Verified** → player’s device shows “BINGO VERIFIED!” modal; they can add name to leaderboard or skip. Leaderboard is visible in-app (trophy drawer) and optionally on Stage View.

---

## 7. Where to change look/feel

- **Player card grid/cells**: `app/play/PlayerCard.tsx` (grid, cell classes, win modal).
- **Stage layout/theme**: `app/stage/[gameId]/StageView.tsx`.
- **Host panel**: `app/host/[gameId]/HostDashboard.tsx`.
- **Global animations / brand colors**: `app/globals.css` (pulse-glow, lyricgrid-wave), Tailwind theme in `globals.css` (`--color-brand-neon`, etc.).
- **Home/Join**: `app/page.tsx`, `app/join/JoinForm.tsx`.
