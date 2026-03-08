-- Spotify: optional track id and album art on media_library and playlist_songs.
-- Run in Supabase SQL Editor after RUN-ALL-MIGRATIONS.sql (or after media-and-game-options).

-- media_library: Spotify tracks saved from Search (no file upload)
alter table public.media_library
  add column if not exists spotify_track_id text;
alter table public.media_library
  add column if not exists album_art_url text;
-- For Spotify rows use file_path = 'spotify/<track_id>' so file_path stays not null.

-- playlist_songs: support source = 'spotify'
alter table public.playlist_songs
  add column if not exists spotify_track_id text;
alter table public.playlist_songs
  add column if not exists album_art_url text;

-- Drop old check and add new one including 'spotify' (run only if your schema has the check)
do $$
begin
  alter table public.playlist_songs drop constraint if exists playlist_songs_source_check;
exception when others then null;
end $$;
alter table public.playlist_songs
  add constraint playlist_songs_source_check
  check (source in ('youtube', 'local', 'spotify'));

-- Same for media_library file_type if we allow 'spotify'
alter table public.media_library drop constraint if exists media_library_file_type_check;
alter table public.media_library
  add constraint media_library_file_type_check
  check (file_type in ('mp3', 'mp4', 'spotify'));

NOTIFY pgrst, 'reload schema';
