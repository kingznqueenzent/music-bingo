-- Allow app to insert into theme_songs (for Import YouTube playlist / paste URLs).
drop policy if exists "Allow insert theme_songs" on public.theme_songs;
create policy "Allow insert theme_songs" on public.theme_songs for insert with check (true);
