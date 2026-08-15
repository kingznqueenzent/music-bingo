-- Create the "sfx-assets" storage bucket for host soundboard uploads (MP3/WAV).
-- Run in Supabase SQL Editor if the bucket is missing.
-- Full table + policies: supabase/migrations/20260815120000_sfx_assets.sql

insert into storage.buckets (id, name, public)
values ('sfx-assets', 'sfx-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public read sfx-assets bucket" on storage.objects;
create policy "Public read sfx-assets bucket"
on storage.objects for select
to public
using (bucket_id = 'sfx-assets');

drop policy if exists "Allow uploads to sfx-assets bucket" on storage.objects;
create policy "Allow uploads to sfx-assets bucket"
on storage.objects for insert
to public
with check (bucket_id = 'sfx-assets');

drop policy if exists "Allow delete sfx-assets bucket" on storage.objects;
create policy "Allow delete sfx-assets bucket"
on storage.objects for delete
to public
using (bucket_id = 'sfx-assets');
