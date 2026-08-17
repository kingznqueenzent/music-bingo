-- Create / refresh the "media" storage bucket for LyricGrid Media Manager (MP3/MP4).
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Bucket id must stay `media` — matches MEDIA_BUCKET in lib/media/supabase-storage-upload.ts.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  104857600, -- 100 MB
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/aac',
    'audio/mp4',
    'audio/x-m4a',
    'audio/m4a',
    'video/mp4',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Allow public read so playback URLs work (e.g. in Stage View / player)
drop policy if exists "Public read media bucket" on storage.objects;
create policy "Public read media bucket"
on storage.objects for select
to public
using (bucket_id = 'media');

-- Allow anon/authenticated upload (Media Manager direct + API fallback)
drop policy if exists "Allow uploads to media bucket" on storage.objects;
create policy "Allow uploads to media bucket"
on storage.objects for insert
to public
with check (bucket_id = 'media');

-- Allow delete (replace / rollback)
drop policy if exists "Allow delete media bucket" on storage.objects;
create policy "Allow delete media bucket"
on storage.objects for delete
to public
using (bucket_id = 'media');
