-- =============================================================================
-- LyricGrid: Genre & Era hierarchy seed (1950s–2026). Searchable by Era + Genre.
-- Run after: RUN-FULL-SETUP.sql (or schema-genre-era.sql) and optionally seed-themes.sql.
-- =============================================================================

-- Fixed IDs for genres and eras so themes can reference them
-- Genres
INSERT INTO public.genres (id, name, slug, sort_order) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'Rock', 'rock', 1),
  ('b1000001-0000-4000-8000-000000000002', 'Hip-Hop', 'hip-hop', 2),
  ('b1000001-0000-4000-8000-000000000003', 'Reggae', 'reggae', 3),
  ('b1000001-0000-4000-8000-000000000004', 'R&B & Soul', 'rb-soul', 4),
  ('b1000001-0000-4000-8000-000000000005', 'Afrobeats & Global', 'afrobeats-global', 5),
  ('b1000001-0000-4000-8000-000000000006', 'Pop', 'pop', 6),
  ('b1000001-0000-4000-8000-000000000007', 'Country', 'country', 7),
  ('b1000001-0000-4000-8000-000000000008', 'Jazz', 'jazz', 8),
  ('b1000001-0000-4000-8000-000000000009', 'Screen & Media', 'screen-media', 9)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, sort_order = EXCLUDED.sort_order;

-- Eras (start_year, end_year for filtering)
INSERT INTO public.eras (id, name, start_year, end_year, sort_order) VALUES
  ('c1000001-0000-4000-8000-000000000001', '1950s-60s', 1950, 1969, 1),
  ('c1000001-0000-4000-8000-000000000002', '1970s-80s', 1970, 1989, 2),
  ('c1000001-0000-4000-8000-000000000003', '1980s-90s', 1980, 1999, 3),
  ('c1000001-0000-4000-8000-000000000004', '1990s-2000s', 1990, 2009, 4),
  ('c1000001-0000-4000-8000-000000000005', '2000s-10s', 2000, 2019, 5),
  ('c1000001-0000-4000-8000-000000000006', '2010s-26', 2010, 2026, 6),
  ('c1000001-0000-4000-8000-000000000007', '2020s-26', 2020, 2026, 7),
  ('c1000001-0000-4000-8000-000000000008', 'Classic', 1950, 1989, 8),
  ('c1000001-0000-4000-8000-000000000009', 'Modern', 1990, 2019, 9),
  ('c1000001-0000-4000-8000-000000000010', 'Origins', 1950, 1989, 10)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, start_year = EXCLUDED.start_year, end_year = EXCLUDED.end_year, sort_order = EXCLUDED.sort_order;

-- Ensure themes has genre_id and era_id (schema-genre-era / RUN-FULL-SETUP adds these)
ALTER TABLE public.themes ADD COLUMN IF NOT EXISTS genre_id uuid REFERENCES public.genres(id) ON DELETE SET NULL;
ALTER TABLE public.themes ADD COLUMN IF NOT EXISTS era_id uuid REFERENCES public.eras(id) ON DELETE SET NULL;

-- Rock: 1950s-60s
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Rock & Roll', 'genre', '1950s-60s Rock & Roll.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000001'),
  (gen_random_uuid(), 'Rockabilly', 'genre', '1950s-60s Rockabilly.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000001'),
  (gen_random_uuid(), 'British Invasion', 'genre', '1950s-60s British Invasion.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000001'),
  (gen_random_uuid(), 'Psychedelic Rock', 'genre', '1950s-60s Psychedelic.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000001');

-- Rock: 1970s-80s
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Hard Rock', 'genre', '1970s-80s Hard Rock.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'Punk', 'genre', '1970s-80s Punk.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'New Wave', 'genre', '1970s-80s New Wave.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'Glam Rock', 'genre', '1970s-80s Glam.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'Thrash Metal', 'genre', '1970s-80s Thrash Metal.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000002')
;

-- Rock: 1990s-2000s
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Grunge', 'genre', '1990s-2000s Grunge.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000004'),
  (gen_random_uuid(), 'Alt-Rock', 'genre', '1990s-2000s Alt-Rock.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000004'),
  (gen_random_uuid(), 'Nu-Metal', 'genre', '1990s-2000s Nu-Metal.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000004'),
  (gen_random_uuid(), 'Indie Rock', 'genre', '1990s-2000s Indie.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000004'),
  (gen_random_uuid(), 'Emo', 'genre', '1990s-2000s Emo.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000004')
;

-- Rock: 2010s-2026
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Shoegaze Revival', 'genre', '2010s-2026 Shoegaze Revival.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000006'),
  (gen_random_uuid(), 'Post-Rock', 'genre', '2010s-2026 Post-Rock.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000006'),
  (gen_random_uuid(), 'Digicore-Rock', 'genre', '2010s-2026 Digicore-Rock.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000006'),
  (gen_random_uuid(), 'AI-Generative Rock', 'genre', '2010s-2026 AI-Generative Rock.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000006')
;

-- Hip-Hop: 1980s-90s
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Old School Hip-Hop', 'genre', '1980s-90s Old School.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000003'),
  (gen_random_uuid(), 'Boom Bap', 'genre', '1980s-90s Boom Bap.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000003'),
  (gen_random_uuid(), 'G-Funk', 'genre', '1980s-90s G-Funk.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000003'),
  (gen_random_uuid(), 'East Coast Hip-Hop', 'genre', '1980s-90s East Coast.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000003'),
  (gen_random_uuid(), 'West Coast Hip-Hop', 'genre', '1980s-90s West Coast.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000003')
;

-- Hip-Hop: 2000s-10s
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Dirty South', 'genre', '2000s-10s Dirty South.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000005'),
  (gen_random_uuid(), 'Trap', 'genre', '2000s-10s Trap.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000005'),
  (gen_random_uuid(), 'Cloud Rap', 'genre', '2000s-10s Cloud Rap.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000005'),
  (gen_random_uuid(), 'UK Drill', 'genre', '2000s-10s UK/NY Drill.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000005')
;

-- Hip-Hop: 2020s-26
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Rage', 'genre', '2020s-26 Rage.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000007'),
  (gen_random_uuid(), 'Jersey Club Rap', 'genre', '2020s-26 Jersey Club Rap.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000007'),
  (gen_random_uuid(), 'Sample-Drill', 'genre', '2020s-26 Sample-Drill.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000007'),
  (gen_random_uuid(), 'Global Fusion Hip-Hop', 'genre', '2020s-26 Global Fusion.', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'b1000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000007')
;

-- Reggae: 1970s-80s
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Roots Reggae', 'genre', '1970s-80s Roots.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'Dub', 'genre', '1970s-80s Dub.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'Lovers Rock', 'genre', '1970s-80s Lovers Rock.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'Early Dancehall', 'genre', '1970s-80s Early Dancehall.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'Rub-a-Dub', 'genre', '1970s-80s Rub-a-Dub.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000002')
;

-- Reggae: 1990s-2000s
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Reggae Fusion', 'genre', '1990s-2000s Reggae Fusion.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000004'),
  (gen_random_uuid(), 'Conscious Dancehall', 'genre', '1990s-2000s Conscious Dancehall.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000004'),
  (gen_random_uuid(), 'Modern Roots', 'genre', '1990s-2000s Modern Roots.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000004')
;

-- Reggae: 2010s-26
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Afro-Dancehall', 'genre', '2010s-26 Afro-Dancehall.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000006'),
  (gen_random_uuid(), 'Digital Reggae', 'genre', '2010s-26 Digital Reggae.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000006'),
  (gen_random_uuid(), 'Lo-fi Reggae', 'genre', '2010s-26 Lo-fi Reggae.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000006')
;

-- R&B & Soul: Classic
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Motown', 'genre', 'Classic Motown.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000008'),
  (gen_random_uuid(), 'Soul', 'genre', 'Classic Soul.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000008'),
  (gen_random_uuid(), 'Funk', 'genre', 'Classic Funk.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000008'),
  (gen_random_uuid(), 'Disco', 'genre', 'Classic Disco.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000008')
;

-- R&B & Soul: Modern
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'New Jack Swing', 'genre', 'Modern New Jack Swing.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000009'),
  (gen_random_uuid(), 'Neo-Soul', 'genre', 'Modern Neo-Soul.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000009'),
  (gen_random_uuid(), 'Trap-Soul', 'genre', 'Modern Trap-Soul.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000009'),
  (gen_random_uuid(), 'Alternative R&B', 'genre', 'Modern Alternative R&B.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000009')
;

-- R&B & Soul: 2020s-26
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'PluggnB', 'genre', '2020s-26 PluggnB.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000007'),
  (gen_random_uuid(), 'Afro-Soul', 'genre', '2020s-26 Afro-Soul.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000007'),
  (gen_random_uuid(), 'Ambient R&B', 'genre', '2020s-26 Ambient R&B.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000007')
;

-- Afrobeats & Global: Origins
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Afrobeat', 'genre', 'Origins Afrobeat.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000010'),
  (gen_random_uuid(), 'Highlife', 'genre', 'Origins Highlife.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000010'),
  (gen_random_uuid(), 'Jùjú', 'genre', 'Origins Jùjú.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000010')
;

-- Afrobeats & Global: Modern
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Afropop', 'genre', 'Modern Afropop.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000009'),
  (gen_random_uuid(), 'Gqom', 'genre', 'Modern Gqom.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000009'),
  (gen_random_uuid(), 'Amapiano', 'genre', '2020s Amapiano.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000007'),
  (gen_random_uuid(), 'Alté', 'genre', 'Modern Alté.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000009'),
  (gen_random_uuid(), 'Afro-Drill', 'genre', 'Modern Afro-Drill.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000009')
;

-- Pop
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Synth-Pop', 'genre', 'Synth-Pop.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000006', 'c1000001-0000-4000-8000-000000000004'),
  (gen_random_uuid(), 'Teen Pop', 'genre', 'Teen Pop.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000006', 'c1000001-0000-4000-8000-000000000004'),
  (gen_random_uuid(), 'Hyperpop', 'genre', 'Hyperpop.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000006', 'c1000001-0000-4000-8000-000000000006'),
  (gen_random_uuid(), 'K-Pop', 'genre', 'K-Pop.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000006', 'c1000001-0000-4000-8000-000000000006'),
  (gen_random_uuid(), 'Art Pop', 'genre', 'Art Pop.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000006', 'c1000001-0000-4000-8000-000000000006')
;

-- Country
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Honky Tonk', 'genre', 'Honky Tonk.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', 'b1000001-0000-4000-8000-000000000007', 'c1000001-0000-4000-8000-000000000008'),
  (gen_random_uuid(), 'Outlaw Country', 'genre', 'Outlaw.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', 'b1000001-0000-4000-8000-000000000007', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'Bro-Country', 'genre', 'Bro-Country.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', 'b1000001-0000-4000-8000-000000000007', 'c1000001-0000-4000-8000-000000000005'),
  (gen_random_uuid(), 'Country-Trap', 'genre', 'Country-Trap.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', 'b1000001-0000-4000-8000-000000000007', 'c1000001-0000-4000-8000-000000000007')
;

-- Jazz
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Bebop', 'genre', 'Bebop.', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', 'b1000001-0000-4000-8000-000000000008', 'c1000001-0000-4000-8000-000000000001'),
  (gen_random_uuid(), 'Jazz Fusion', 'genre', 'Fusion.', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', 'b1000001-0000-4000-8000-000000000008', 'c1000001-0000-4000-8000-000000000002'),
  (gen_random_uuid(), 'Acid Jazz', 'genre', 'Acid Jazz.', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', 'b1000001-0000-4000-8000-000000000008', 'c1000001-0000-4000-8000-000000000004'),
  (gen_random_uuid(), 'Jazztronica', 'genre', 'Jazztronica.', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', 'b1000001-0000-4000-8000-000000000008', 'c1000001-0000-4000-8000-000000000006')
;

-- Screen & Media
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  (gen_random_uuid(), 'Movie Themes (Epic/Noir)', 'genre', 'Movie themes: Epic, Noir.', 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', 'b1000001-0000-4000-8000-000000000009', NULL),
  (gen_random_uuid(), 'TV Shows (Sitcom/Anime)', 'genre', 'TV: Sitcom, Anime.', 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', 'b1000001-0000-4000-8000-000000000009', NULL),
  (gen_random_uuid(), 'Video Game OSTs', 'genre', 'Video Game soundtracks.', 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', 'b1000001-0000-4000-8000-000000000009', NULL)
;
