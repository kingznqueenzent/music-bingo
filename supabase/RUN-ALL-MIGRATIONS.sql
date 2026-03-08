-- Run this ENTIRE file in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste all → Run).
-- Order: base schema first, then media/game options, then tiers.

-- ========== 1. BASE SCHEMA ==========
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  youtube_id text,
  title text,
  position int not null default 0,
  created_at timestamptz default now(),
  unique(playlist_id, position)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete restrict,
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby','playing','ended')),
  current_song_id uuid references public.playlist_songs(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_name text not null,
  player_identifier text,
  created_at timestamptz default now(),
  unique(game_id, player_identifier)
);

create table if not exists public.card_cells (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  playlist_song_id uuid not null references public.playlist_songs(id) on delete cascade,
  position int not null check (position >= 0 and position < 25),
  created_at timestamptz default now(),
  unique(card_id, position)
);

create table if not exists public.played_songs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  playlist_song_id uuid not null references public.playlist_songs(id) on delete cascade,
  played_at timestamptz default now()
);

create index if not exists idx_playlist_songs_playlist on public.playlist_songs(playlist_id);
create index if not exists idx_games_code on public.games(code);
create index if not exists idx_games_status on public.games(status);
create index if not exists idx_cards_game on public.cards(game_id);
create index if not exists idx_card_cells_card on public.card_cells(card_id);
create index if not exists idx_played_songs_game on public.played_songs(game_id);

alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.games enable row level security;
alter table public.cards enable row level security;
alter table public.card_cells enable row level security;
alter table public.played_songs enable row level security;

create policy "Allow read games" on public.games for select using (true);
create policy "Allow read playlist_songs" on public.playlist_songs for select using (true);
create policy "Allow read cards for own card" on public.cards for select using (true);
create policy "Allow read card_cells" on public.card_cells for select using (true);
create policy "Allow read played_songs" on public.played_songs for select using (true);
create policy "Allow read playlists" on public.playlists for select using (true);
create policy "Allow insert games" on public.games for insert with check (true);
create policy "Allow update games" on public.games for update using (true);
create policy "Allow insert playlists" on public.playlists for insert with check (true);
create policy "Allow insert playlist_songs" on public.playlist_songs for insert with check (true);
create policy "Allow insert cards" on public.cards for insert with check (true);
create policy "Allow insert card_cells" on public.card_cells for insert with check (true);
create policy "Allow insert played_songs" on public.played_songs for insert with check (true);

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  artwork_url text,
  created_at timestamptz default now()
);

create table if not exists public.theme_songs (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.themes(id) on delete cascade,
  youtube_id text not null,
  title text,
  position int not null default 0,
  created_at timestamptz default now()
);

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

alter table public.games add column if not exists theme_id uuid references public.themes(id) on delete set null;
alter table public.games add column if not exists mode text not null default 'line';
alter table public.games add column if not exists round int not null default 1;
alter table public.played_songs add column if not exists round int not null default 1;

create index if not exists idx_themes_category on public.themes(category);
create index if not exists idx_theme_songs_theme on public.theme_songs(theme_id);
create index if not exists idx_wins_game on public.wins(game_id);
create index if not exists idx_wins_created_at on public.wins(created_at);

alter table public.themes enable row level security;
alter table public.theme_songs enable row level security;
alter table public.wins enable row level security;
create policy "Allow read themes" on public.themes for select using (true);
create policy "Allow read theme_songs" on public.theme_songs for select using (true);
create policy "Allow read wins" on public.wins for select using (true);

-- ========== 2. MEDIA + GAME OPTIONS ==========
alter table public.playlist_songs add column if not exists source text not null default 'youtube' check (source in ('youtube', 'local'));
alter table public.playlist_songs add column if not exists file_url text;

alter table public.games add column if not exists clip_seconds int not null default 20 check (clip_seconds >= 10 and clip_seconds <= 120);
alter table public.games add column if not exists crossfade_seconds int not null default 0 check (crossfade_seconds >= 0 and crossfade_seconds <= 10);
alter table public.games add column if not exists grid_size int not null default 5 check (grid_size in (4, 5));

create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text not null,
  file_url text,
  storage_bucket text not null default 'media',
  file_type text not null check (file_type in ('mp3', 'mp4')),
  file_size_bytes bigint,
  created_at timestamptz default now()
);
create index if not exists idx_media_library_created on public.media_library(created_at desc);
alter table public.media_library enable row level security;
create policy "Allow read media_library" on public.media_library for select using (true);
create policy "Allow insert media_library" on public.media_library for insert with check (true);
create policy "Allow delete media_library" on public.media_library for delete using (true);

-- ========== 3. TIERS + BRANDING ==========
alter table public.games add column if not exists tier text not null default 'free' check (tier in ('free', 'pro', 'enterprise'));
alter table public.games add column if not exists logo_url text;
alter table public.games add column if not exists stage_show_leaderboard boolean not null default false;

-- ========== 4. LEADERBOARD (WIN TRACKING) ==========
alter table public.wins add column if not exists claimed_at timestamptz;
do $$ begin if not exists (select 1 from pg_policies where tablename = 'wins' and policyname = 'Allow update wins') then
  create policy "Allow update wins" on public.wins for update using (true);
end if; end $$;

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  identifier text not null unique,
  wins int not null default 0,
  points int not null default 0,
  last_played timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_leaderboard_points on public.leaderboard(points desc);
create index if not exists idx_leaderboard_identifier on public.leaderboard(identifier);
alter table public.leaderboard enable row level security;
create policy "Allow read leaderboard" on public.leaderboard for select using (true);
create policy "Allow insert leaderboard" on public.leaderboard for insert with check (true);
create policy "Allow update leaderboard" on public.leaderboard for update using (true);

NOTIFY pgrst, 'reload schema';
