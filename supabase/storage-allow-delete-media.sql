-- Allow deleting files from the media bucket (required for "Remove from library").
-- Run in Supabase: SQL Editor → New query → paste → Run.

drop policy if exists "Allow delete media bucket" on storage.objects;
create policy "Allow delete media bucket"
on storage.objects for delete
to public
using (bucket_id = 'media');
