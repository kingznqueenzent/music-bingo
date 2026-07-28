-- DJ mix copyright analyzer: catalog tracks, fingerprints, claims, YouTube tests, mix analyses.
-- Apply via Supabase CLI or SQL Editor after existing migrations.

-- ---------------------------------------------------------------------------
-- 1. tracks
-- ---------------------------------------------------------------------------
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  isrc text,
  title text not null,
  artist text,
  album text,
  label text,
  duration_seconds numeric(10, 3),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracks_isrc_len check (isrc is null or char_length(isrc) between 12 and 15)
);

-- If `tracks` predates this file, ensure columns exist before indexes/policies
alter table public.tracks add column if not exists isrc text;
alter table public.tracks add column if not exists title text;
alter table public.tracks add column if not exists artist text;
alter table public.tracks add column if not exists album text;
alter table public.tracks add column if not exists label text;
alter table public.tracks add column if not exists duration_seconds numeric(10, 3);
alter table public.tracks add column if not exists metadata jsonb;
alter table public.tracks add column if not exists created_at timestamptz;
alter table public.tracks add column if not exists updated_at timestamptz;
update public.tracks set metadata = coalesce(metadata, '{}'::jsonb) where metadata is null;
update public.tracks set title = coalesce(nullif(trim(title), ''), 'Untitled') where title is null;
update public.tracks set created_at = coalesce(created_at, now()) where created_at is null;
update public.tracks set updated_at = coalesce(updated_at, now()) where updated_at is null;
alter table public.tracks alter column metadata set default '{}'::jsonb;
alter table public.tracks alter column metadata set not null;
alter table public.tracks alter column title set not null;
alter table public.tracks alter column created_at set default now();
alter table public.tracks alter column created_at set not null;
alter table public.tracks alter column updated_at set default now();
alter table public.tracks alter column updated_at set not null;
do $$
begin
  alter table public.tracks add constraint tracks_isrc_len check (isrc is null or char_length(isrc) between 12 and 15);
exception when duplicate_object then null;
end $$;

create unique index if not exists tracks_isrc_unique
  on public.tracks (isrc)
  where isrc is not null;

create index if not exists tracks_title_artist_idx on public.tracks (artist, title);
create index if not exists tracks_metadata_gin on public.tracks using gin (metadata jsonb_path_ops);
create index if not exists tracks_label_idx on public.tracks (label) where label is not null;

-- ---------------------------------------------------------------------------
-- 2. mix_analyses (before fingerprints FK)
-- ---------------------------------------------------------------------------
create table if not exists public.mix_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  storage_uri text not null,
  original_filename text,
  mime_type text not null default 'audio/mpeg',
  byte_size bigint,
  duration_seconds numeric(10, 3),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  summary jsonb not null default '{}',
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists mix_analyses_user_created_idx on public.mix_analyses (user_id, created_at desc);
create index if not exists mix_analyses_status_created_idx on public.mix_analyses (status, created_at desc);
create index if not exists mix_analyses_summary_gin on public.mix_analyses using gin (summary jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- 3. fingerprints
-- ---------------------------------------------------------------------------
create table if not exists public.fingerprints (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks (id) on delete cascade,
  mix_analysis_id uuid references public.mix_analyses (id) on delete cascade,
  provider text not null,
  provider_fingerprint_id text,
  window_start_sec numeric(10, 3) not null default 0,
  window_duration_sec numeric(10, 3),
  fingerprint_hash text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint fingerprints_target_chk check (
    (track_id is not null)::int + (mix_analysis_id is not null)::int >= 1
  )
);

create index if not exists fingerprints_track_id_idx on public.fingerprints (track_id);
create index if not exists fingerprints_mix_analysis_id_idx on public.fingerprints (mix_analysis_id);
create index if not exists fingerprints_provider_hash_idx
  on public.fingerprints (provider, fingerprint_hash)
  where fingerprint_hash is not null;
create index if not exists fingerprints_payload_gin on public.fingerprints using gin (payload jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- 4. copyright_claims
-- ---------------------------------------------------------------------------
create table if not exists public.copyright_claims (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  mix_analysis_id uuid references public.mix_analyses (id) on delete set null,
  claimant_name text not null,
  claim_type text not null
    check (claim_type in ('composition', 'sound_recording', 'both', 'unknown')),
  territory jsonb not null default '{}',
  policy_hints jsonb not null default '{}',
  source text,
  source_reference text,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists copyright_claims_track_id_idx on public.copyright_claims (track_id);
create index if not exists copyright_claims_mix_analysis_id_idx on public.copyright_claims (mix_analysis_id)
  where mix_analysis_id is not null;
create index if not exists copyright_claims_claimant_idx on public.copyright_claims (claimant_name);
create index if not exists copyright_claims_policy_gin on public.copyright_claims using gin (policy_hints jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- 5. youtube_tests
-- ---------------------------------------------------------------------------
create table if not exists public.youtube_tests (
  id uuid primary key default gen_random_uuid(),
  mix_analysis_id uuid not null references public.mix_analyses (id) on delete cascade,
  track_id uuid references public.tracks (id) on delete set null,
  test_kind text not null
    check (test_kind in (
      'shorts_clip', 'full_upload', 'content_id_simulation', 'metadata_only', 'other'
    )),
  youtube_video_id text,
  channel_id text,
  result jsonb not null default '{}',
  notes text,
  tested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists youtube_tests_mix_analysis_idx on public.youtube_tests (mix_analysis_id);
create index if not exists youtube_tests_track_id_idx on public.youtube_tests (track_id) where track_id is not null;
create index if not exists youtube_tests_video_id_idx on public.youtube_tests (youtube_video_id)
  where youtube_video_id is not null;
create index if not exists youtube_tests_result_gin on public.youtube_tests using gin (result jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- RLS (align with open read/write patterns used elsewhere in this project)
-- ---------------------------------------------------------------------------
alter table public.tracks enable row level security;
alter table public.mix_analyses enable row level security;
alter table public.fingerprints enable row level security;
alter table public.copyright_claims enable row level security;
alter table public.youtube_tests enable row level security;

drop policy if exists "tracks_select" on public.tracks;
create policy "tracks_select" on public.tracks for select using (true);
drop policy if exists "tracks_insert" on public.tracks;
create policy "tracks_insert" on public.tracks for insert with check (true);
drop policy if exists "tracks_update" on public.tracks;
create policy "tracks_update" on public.tracks for update using (true) with check (true);
drop policy if exists "tracks_delete" on public.tracks;
create policy "tracks_delete" on public.tracks for delete using (true);

drop policy if exists "mix_analyses_select" on public.mix_analyses;
create policy "mix_analyses_select" on public.mix_analyses for select using (true);
drop policy if exists "mix_analyses_insert" on public.mix_analyses;
create policy "mix_analyses_insert" on public.mix_analyses for insert with check (true);
drop policy if exists "mix_analyses_update" on public.mix_analyses;
create policy "mix_analyses_update" on public.mix_analyses for update using (true) with check (true);
drop policy if exists "mix_analyses_delete" on public.mix_analyses;
create policy "mix_analyses_delete" on public.mix_analyses for delete using (true);

drop policy if exists "fingerprints_select" on public.fingerprints;
create policy "fingerprints_select" on public.fingerprints for select using (true);
drop policy if exists "fingerprints_insert" on public.fingerprints;
create policy "fingerprints_insert" on public.fingerprints for insert with check (true);
drop policy if exists "fingerprints_update" on public.fingerprints;
create policy "fingerprints_update" on public.fingerprints for update using (true) with check (true);
drop policy if exists "fingerprints_delete" on public.fingerprints;
create policy "fingerprints_delete" on public.fingerprints for delete using (true);

drop policy if exists "copyright_claims_select" on public.copyright_claims;
create policy "copyright_claims_select" on public.copyright_claims for select using (true);
drop policy if exists "copyright_claims_insert" on public.copyright_claims;
create policy "copyright_claims_insert" on public.copyright_claims for insert with check (true);
drop policy if exists "copyright_claims_update" on public.copyright_claims;
create policy "copyright_claims_update" on public.copyright_claims for update using (true) with check (true);
drop policy if exists "copyright_claims_delete" on public.copyright_claims;
create policy "copyright_claims_delete" on public.copyright_claims for delete using (true);

drop policy if exists "youtube_tests_select" on public.youtube_tests;
create policy "youtube_tests_select" on public.youtube_tests for select using (true);
drop policy if exists "youtube_tests_insert" on public.youtube_tests;
create policy "youtube_tests_insert" on public.youtube_tests for insert with check (true);
drop policy if exists "youtube_tests_update" on public.youtube_tests;
create policy "youtube_tests_update" on public.youtube_tests for update using (true) with check (true);
drop policy if exists "youtube_tests_delete" on public.youtube_tests;
create policy "youtube_tests_delete" on public.youtube_tests for delete using (true);

notify pgrst, 'reload schema';
