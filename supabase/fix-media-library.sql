-- Run this in Supabase: SQL Editor → New query → paste all → Run
-- Fixes "Could not find the table 'public.media_library' in the schema cache"

-- 1. Create media_library table (if it doesn't exist)
create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text not null,
  file_url text,
  storage_bucket text not null default 'media',
  file_type text not null check (file_type in ('mp3', 'mp4', 'spotify')),
  file_size_bytes bigint,
  spotify_track_id text,
  album_art_url text,
  created_at timestamptz default now()
);

-- 2. Optional: add Spotify columns if missing (for Search Spotify tab)
alter table public.media_library add column if not exists spotify_track_id text;
alter table public.media_library add column if not exists album_art_url text;
alter table public.media_library drop constraint if exists media_library_file_type_check;
alter table public.media_library add constraint media_library_file_type_check check (file_type in ('mp3', 'mp4', 'spotify'));

-- 3. Index and RLS
create index if not exists idx_media_library_created on public.media_library(created_at desc);

alter table public.media_library enable row level security;

drop policy if exists "Allow read media_library" on public.media_library;
create policy "Allow read media_library" on public.media_library for select using (true);

drop policy if exists "Allow insert media_library" on public.media_library;
create policy "Allow insert media_library" on public.media_library for insert with check (true);

drop policy if exists "Allow delete media_library" on public.media_library;
create policy "Allow delete media_library" on public.media_library for delete using (true);

drop policy if exists "Allow update media_library" on public.media_library;
create policy "Allow update media_library" on public.media_library for update using (true) with check (true);

-- 4. Tell PostgREST to reload schema (fixes schema cache)
notify pgrst, 'reload schema';
