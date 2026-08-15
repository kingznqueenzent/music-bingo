-- Host soundboard SFX assets (MP3/WAV) stored in the sfx-assets bucket.
-- Run via Supabase SQL Editor or apply-all-migrations script.

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

create table if not exists public.sfx_assets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  name text not null,
  file_path text not null,
  file_url text not null,
  storage_bucket text not null default 'sfx-assets',
  file_type text not null check (file_type in ('mp3', 'wav')),
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_sfx_assets_game_created
  on public.sfx_assets (game_id, created_at desc);

alter table public.sfx_assets enable row level security;

drop policy if exists "sfx_assets_select" on public.sfx_assets;
create policy "sfx_assets_select" on public.sfx_assets for select using (true);

drop policy if exists "sfx_assets_insert" on public.sfx_assets;
create policy "sfx_assets_insert" on public.sfx_assets for insert with check (true);

drop policy if exists "sfx_assets_update" on public.sfx_assets;
create policy "sfx_assets_update" on public.sfx_assets for update using (true);

drop policy if exists "sfx_assets_delete" on public.sfx_assets;
create policy "sfx_assets_delete" on public.sfx_assets for delete using (true);

grant select, insert, update, delete on public.sfx_assets to anon, authenticated;
grant all on public.sfx_assets to service_role;

notify pgrst, 'reload schema';
