-- Allow updating media_library rows (e.g. save track name per track).
-- Run in Supabase: SQL Editor → New query → paste → Run

drop policy if exists "Allow update media_library" on public.media_library;
create policy "Allow update media_library" on public.media_library for update using (true) with check (true);

notify pgrst, 'reload schema';
