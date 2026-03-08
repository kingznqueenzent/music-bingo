# Music Bingo – What It Took to Build This App

A point-form breakdown of the work involved, for sharing with the community.

---

## Tech stack & foundation
- Next.js 16 (App Router) for the full web app
- TypeScript across frontend and backend
- Tailwind CSS for layout and styling
- Supabase (PostgreSQL + Realtime + Storage) for data and media
- YouTube IFrame API for YouTube-based games
- Vercel for hosting and deployment
- Git + GitHub for version control

---

## Host experience
- Host dashboard to create and run games
- Create games from **YouTube links** (paste URLs) or from **Media Library** (uploaded MP3/MP4)
- Theme-based games: pick a curated theme (decades, genres, mood) and host from that song list
- **Game code** + **QR code** so players can join quickly
- **Tiers**: Free (10 players), Pro (50, media/video), Enterprise (unlimited, custom logo)
- **Grid size**: 5×5 or 4×4 cards (with correct minimum song counts)
- **Winning patterns**: Single Line, X-Shape, or Full House (Blackout)
- **Clip length & crossfade**: 20s / 30s / 45s hooks and 0s / 3s crossfade between tracks
- **Playlist view**: “Up next” vs “Played” so the host doesn’t repeat songs
- **Master Board**: Enter a player’s card ID to see their card and verify a BINGO
- **PDF export**: Print-friendly PDF of all bingo cards (2 or 4 per page)
- **Stage View**: Separate window for video/song display (e.g. second screen or projector)
- Manual skip, play/pause, and play-next from the playlist

---

## Player experience
- **Unique random cards** per player (different layout for everyone)
- **Sticky card**: Marked squares saved in the browser so refresh/reconnect doesn’t wipe the card
- **Real-time updates**: Card marks update live as the host plays songs
- **Custom branding**: Enterprise games can show your logo on the player card
- Join by **game code** or by **scanning the host’s QR code**
- Join link can include the code: `/join?code=ABC123`

---

## Media & playback
- **Media Manager**: Upload and index MP3/MP4 to Supabase Storage; use them in games
- **YouTube playback** with configurable clip length and crossfade
- **Local file playback**: Audio/video for Media Library tracks in host and Stage View
- **Auto-snippets**: Play only the first 20–45 seconds of each track (the “hook”)

---

## Game logic & verification
- **Digital BINGO verification**: When a player calls BINGO, host can verify via Master Board or API
- **Wins recorded** automatically (game, card, player, mode, round) for future leaderboards
- Support for **Single Line**, **X**, and **Blackout** win patterns
- **4×4 and 5×5** grids with correct minimum song counts (32 and 45)
- **Tier limits** enforced when joining (e.g. Free cap at 10 players)

---

## Database & backend
- **Supabase**: Tables for playlists, playlist_songs, games, cards, card_cells, played_songs, themes, theme_songs, wins, media_library; RLS policies and indexes
- **Migrations**: Base schema + media/game options + tiers/branding; single “run all” script for new projects
- **Storage**: “media” bucket for MP3/MP4 with public read and upload policies
- **Realtime**: Live updates for played songs and card state
- **Server actions & API routes**: Create game, join game, play song, verify BINGO, media upload, health check
- **Direct PostgreSQL** path for theme creation where needed (to avoid API cache issues)

---

## Deployment & operations
- **Vercel**: Connect GitHub repo, set environment variables, auto-deploy on push
- **Environment variables**: Supabase URL, anon key, service role key, database URL (documented for local and Vercel)
- **Build fixes**: Resilient Supabase client and dynamic routes so the app builds on Vercel without failing on missing env at build time
- **Live app URL** documented and shared (e.g. music-bingo-kingzandqueenzentertainment-1662s-projects.vercel.app)

---

## Documentation & scripts
- **Setup & deploy**: README, SETUP.md, DEPLOY-VERCEL.md, VERCEL-ENV-VARS.md, PROJECT-COMPLETE.md
- **Troubleshooting**: VERCEL-FIX-VISUAL-GUIDE.md, VERCEL-CANNOT-ACCESS-PROJECT.md, vercel-fix-guide.html (visual step-by-step)
- **Supabase**: Connection string guide, RUN-ALL-MIGRATIONS.sql, create-media-bucket.sql
- **Roadmap**: ROADMAP.md (what’s next: leaderboard UI, prizes, auth, payments)
- **Scripts**: Push to GitHub (PowerShell), Vercel env add (CLI), Streamer.bot listener, YouTube playlist fetch helpers

---

## Monetization & scale (structure in place)
- **Tiers**: Free, Pro, Enterprise with different player limits and features
- **Prizes & leaderboard**: Database and backend ready; UI can be added later
- **PDF export**: For venues that want to print cards
- **Custom branding**: Enterprise logo on cards and PDF

---

## UX & polish
- **Dark slate** theme across Host, Join, and main app
- **Responsive** layout for mobile and desktop
- **Error handling** and clear messages (e.g. “Game not found”, “Not enough songs”)
- **QR code** for join URL so players don’t have to type the link

---

## Summary for the community
- **Full-stack web app**: Frontend, backend, database, storage, and deployment
- **Multiple ways to play**: YouTube links, uploaded media, and theme-based games
- **Host tools**: Dashboard, Master Board, PDF export, Stage View, clip/crossfade, winning patterns
- **Player tools**: Unique cards, real-time updates, sticky card, join by code or QR
- **Production-ready**: Deployed on Vercel, env vars documented, migrations and bucket setup scripted
- **Extensible**: Prizes, leaderboard, and auth can be added on top of the current structure

You can copy the sections you need and paste them into a Facebook post (with or without the headings). Adjust wording to match your community’s tone.
