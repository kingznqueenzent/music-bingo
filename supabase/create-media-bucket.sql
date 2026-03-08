-- Create the "media" storage bucket if it doesn't exist.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Then in Dashboard → Storage, you should see the "media" bucket for MP3/MP4 uploads.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Allow public read so playback URLs work (e.g. in Stage View / player)
drop policy if exists "Public read media bucket" on storage.objects;
create policy "Public read media bucket"
on storage.objects for select
to public
using (bucket_id = 'media');

-- Allow anon/service to upload (required for Media Manager uploads)
drop policy if exists "Allow uploads to media bucket" on storage.objects;
create policy "Allow uploads to media bucket"
on storage.objects for insert
to public
with check (bucket_id = 'media');
