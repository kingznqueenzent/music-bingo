-- Music Bingo – run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- After creating tables: enable Realtime for games, played_songs, cards (Dashboard → Database → Replication).

-- Playlists (host creates one per game session)
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Songs in a playlist (YouTube links); need 25+ for 5x5 cards (we use more for variety)
create table if not exists public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  youtube_id text not null,
  title text,
  position int not null default 0,
  created_at timestamptz default now(),
  unique(playlist_id, position)
);

-- Active game session (one per “room”)
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete restrict,
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby','playing','ended')),
  current_song_id uuid references public.playlist_songs(id) on delete set null,
  created_at timestamptz default now()
);

-- Each player’s bingo card
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_name text not null,
  player_identifier text,
  created_at timestamptz default now(),
  unique(game_id, player_identifier)
);

-- 25 cells per card (5x5). position 0–24: row = floor(position/5), col = position % 5
create table if not exists public.card_cells (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  playlist_song_id uuid not null references public.playlist_songs(id) on delete cascade,
  position int not null check (position >= 0 and position < 25),
  created_at timestamptz default now(),
  unique(card_id, position)
);

-- History of songs played in a game (for verification)
create table if not exists public.played_songs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  playlist_song_id uuid not null references public.playlist_songs(id) on delete cascade,
  played_at timestamptz default now()
);

-- Indexes for real-time and lookups
create index if not exists idx_playlist_songs_playlist on public.playlist_songs(playlist_id);
create index if not exists idx_games_code on public.games(code);
create index if not exists idx_games_status on public.games(status);
create index if not exists idx_cards_game on public.cards(game_id);
create index if not exists idx_card_cells_card on public.card_cells(card_id);
create index if not exists idx_played_songs_game on public.played_songs(game_id);

-- RLS (optional but recommended): allow read for anon, restrict writes or use service role in app
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.games enable row level security;
alter table public.cards enable row level security;
alter table public.card_cells enable row level security;
alter table public.played_songs enable row level security;

-- Allow public read for games/cards/playlist_songs so players can see state; restrict writes in app or add policies
create policy "Allow read games" on public.games for select using (true);
create policy "Allow read playlist_songs" on public.playlist_songs for select using (true);
create policy "Allow read cards for own card" on public.cards for select using (true);
create policy "Allow read card_cells" on public.card_cells for select using (true);
create policy "Allow read played_songs" on public.played_songs for select using (true);
create policy "Allow read playlists" on public.playlists for select using (true);

-- Allow insert for cards/card_cells (players join), insert/update for games/played_songs (host) – anon for demo; tighten with auth later
create policy "Allow insert games" on public.games for insert with check (true);
create policy "Allow update games" on public.games for update using (true);
create policy "Allow insert playlists" on public.playlists for insert with check (true);
create policy "Allow insert playlist_songs" on public.playlist_songs for insert with check (true);
create policy "Allow insert cards" on public.cards for insert with check (true);
create policy "Allow insert card_cells" on public.card_cells for insert with check (true);
create policy "Allow insert played_songs" on public.played_songs for insert with check (true);

-- Themes: reusable, curated song pools
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null, -- 'decade' | 'genre' | 'mood'
  description text,
  artwork_url text,
  created_at timestamptz default now()
);

-- Theme songs: link themes to playlist_songs (or direct YouTube IDs)
create table if not exists public.theme_songs (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.themes(id) on delete cascade,
  youtube_id text not null,
  title text,
  position int not null default 0,
  created_at timestamptz default now()
);

-- Wins: simple leaderboard support
create table if not exists public.wins (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  player_identifier text,
  mode text,
  round int not null default 1,
  created_at timestamptz default now(),
  unique(game_id, card_id, round)
);

-- Extend games / played_songs for themes, modes, rounds
alter table public.games
  add column if not exists theme_id uuid references public.themes(id) on delete set null;

alter table public.games
  add column if not exists mode text not null default 'line';

alter table public.games
  add column if not exists round int not null default 1;

alter table public.played_songs
  add column if not exists round int not null default 1;

-- Indexes for new structures
create index if not exists idx_themes_category on public.themes(category);
create index if not exists idx_theme_songs_theme on public.theme_songs(theme_id);
create index if not exists idx_wins_game on public.wins(game_id);
create index if not exists idx_wins_created_at on public.wins(created_at);

-- RLS + basic read policies for themes / wins
alter table public.themes enable row level security;
alter table public.theme_songs enable row level security;
alter table public.wins enable row level security;

create policy "Allow read themes" on public.themes for select using (true);
create policy "Allow read theme_songs" on public.theme_songs for select using (true);
create policy "Allow read wins" on public.wins for select using (true);
