-- Professional Media Engine + Game options
-- Run in Supabase SQL Editor after main schema.

-- Playlist songs: support local media (MP3/MP4) in addition to YouTube
alter table public.playlist_songs
  add column if not exists source text not null default 'youtube' check (source in ('youtube', 'local'));

alter table public.playlist_songs
  add column if not exists file_url text;

-- youtube_id can be null for local-only tracks
alter table public.playlist_songs
  alter column youtube_id drop not null;

-- Games: clip length (hook), crossfade, grid size (4x4 or 5x5)
alter table public.games
  add column if not exists clip_seconds int not null default 20 check (clip_seconds >= 10 and clip_seconds <= 120);

alter table public.games
  add column if not exists crossfade_seconds int not null default 0 check (crossfade_seconds >= 0 and crossfade_seconds <= 10);

alter table public.games
  add column if not exists grid_size int not null default 5 check (grid_size in (4, 5));

-- Card cells: allow 4x4 (positions 0-15) or 5x5 (0-24). Keep check position >= 0 and position < 25.
-- No change needed; we generate 16 or 25 cells based on grid_size.

-- Media library: uploaded MP3/MP4 files (index for Media Manager)
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

alter table public.media_library add column if not exists file_url text;

alter table public.media_library enable row level security;
create policy "Allow read media_library" on public.media_library for select using (true);
create policy "Allow insert media_library" on public.media_library for insert with check (true);
create policy "Allow delete media_library" on public.media_library for delete using (true);

-- Notify PostgREST to reload schema (if using Supabase API)
NOTIFY pgrst, 'reload schema';
