-- =============================================================================
-- Genre & Era hierarchy for LyricGrid (1950s–2026). Run after base schema.
-- Adds: genres, eras, and theme.genre_id / theme.era_id for search by Era & Genre.
-- =============================================================================

-- Parent genres (Rock, Hip-Hop, Reggae, etc.)
create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_genres_slug on public.genres(slug);
create index if not exists idx_genres_sort on public.genres(sort_order);

alter table public.genres enable row level security;
drop policy if exists "Allow read genres" on public.genres;
create policy "Allow read genres" on public.genres for select using (true);

-- Eras (1950s-60s, 1970s-80s, 1990s-2000s, etc.)
create table if not exists public.eras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_year int not null,
  end_year int not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_eras_years on public.eras(start_year, end_year);
create index if not exists idx_eras_sort on public.eras(sort_order);

alter table public.eras enable row level security;
drop policy if exists "Allow read eras" on public.eras;
create policy "Allow read eras" on public.eras for select using (true);

-- Link themes to genre + era (nullable for backward compatibility)
alter table public.themes add column if not exists genre_id uuid references public.genres(id) on delete set null;
alter table public.themes add column if not exists era_id uuid references public.eras(id) on delete set null;
create index if not exists idx_themes_genre on public.themes(genre_id);
create index if not exists idx_themes_era on public.themes(era_id);
