-- =============================================================================
-- BASE44: Playlist categories in order by year + genre (no duplicates).
-- Run in Supabase SQL Editor after RUN-FULL-SETUP.sql and genre/era schema.
-- Categories order: 70's Rock, 80's Rock, 90's Rock, 2000's Rock,
--                   70's R&B, 80's R&B, 80's Reggae, 90's Reggae, 80's Pop, 90's Pop.
-- =============================================================================

-- Ensure themes has genre_id and era_id
ALTER TABLE public.themes ADD COLUMN IF NOT EXISTS genre_id uuid REFERENCES public.genres(id) ON DELETE SET NULL;
ALTER TABLE public.themes ADD COLUMN IF NOT EXISTS era_id uuid REFERENCES public.eras(id) ON DELETE SET NULL;

-- 1) Single-decade eras for base44 (70s, 80s, 90s, 2000s)
INSERT INTO public.eras (id, name, start_year, end_year, sort_order) VALUES
  ('d1000001-0000-4000-8000-000000000001', '70s', 1970, 1979, 20),
  ('d1000001-0000-4000-8000-000000000002', '80s', 1980, 1989, 21),
  ('d1000001-0000-4000-8000-000000000003', '90s', 1990, 1999, 22),
  ('d1000001-0000-4000-8000-000000000004', '2000s', 2000, 2009, 23)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, start_year = EXCLUDED.start_year, end_year = EXCLUDED.end_year, sort_order = EXCLUDED.sort_order;

-- 2) Ensure base44 genres exist (use existing IDs from seed-genre-era-hierarchy)
-- Rock = b1000001-0000-4000-8000-000000000001
-- R&B & Soul = b1000001-0000-4000-8000-000000000004, slug 'rb-soul'
-- Reggae = b1000001-0000-4000-8000-000000000003
-- Pop = b1000001-0000-4000-8000-000000000006
INSERT INTO public.genres (id, name, slug, sort_order) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'Rock', 'rock', 1),
  ('b1000001-0000-4000-8000-000000000004', 'R&B & Soul', 'rb-soul', 2),
  ('b1000001-0000-4000-8000-000000000003', 'Reggae', 'reggae', 3),
  ('b1000001-0000-4000-8000-000000000006', 'Pop', 'pop', 4)
ON CONFLICT (id) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- 3) Themes per category (unique names; fixed IDs to avoid duplicates on re-run)

-- 70's Rock
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-000000000001', '70s Rock Classics', 'genre', 'Classic rock from the 1970s.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000001'),
  ('e1000001-0000-4000-8000-000000000002', '70s Rock Anthems', 'genre', 'Anthem rock and arena rock of the 70s.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000001'),
  ('e1000001-0000-4000-8000-000000000003', '70s Hard Rock', 'genre', 'Hard rock and heavy riffs from the 70s.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, genre_id = EXCLUDED.genre_id, era_id = EXCLUDED.era_id;

-- 80's Rock
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-000000000004', '80s Rock Hits', 'genre', 'Hair metal, arena rock, and 80s rock anthems.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000002'),
  ('e1000001-0000-4000-8000-000000000005', '80s New Wave Rock', 'genre', 'New wave and post-punk from the 80s.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000002'),
  ('e1000001-0000-4000-8000-000000000006', '80s Glam & Metal', 'genre', 'Glam rock and 80s metal.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000002')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, genre_id = EXCLUDED.genre_id, era_id = EXCLUDED.era_id;

-- 90's Rock
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-000000000007', '90s Rock & Grunge', 'genre', 'Grunge and 90s alternative rock.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000003'),
  ('e1000001-0000-4000-8000-000000000008', '90s Alt-Rock', 'genre', 'Alternative rock from the 90s.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000003'),
  ('e1000001-0000-4000-8000-000000000009', '90s Punk & Indie', 'genre', '90s punk and indie rock.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000003')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, genre_id = EXCLUDED.genre_id, era_id = EXCLUDED.era_id;

-- 2000's Rock
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-00000000000a', '2000s Rock', 'genre', 'Rock and post-grunge from the 2000s.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000004'),
  ('e1000001-0000-4000-8000-00000000000b', '2000s Emo & Nu-Metal', 'genre', 'Emo and nu-metal from the 2000s.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000004'),
  ('e1000001-0000-4000-8000-00000000000c', '2000s Indie Rock', 'genre', 'Indie rock of the 2000s.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'b1000001-0000-4000-8000-000000000001', 'd1000001-0000-4000-8000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- 70's R&B
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-00000000000d', '70s R&B & Soul', 'genre', 'Classic R&B and soul from the 70s.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'd1000001-0000-4000-8000-000000000001'),
  ('e1000001-0000-4000-8000-00000000000e', '70s Funk & Disco', 'genre', 'Funk and disco from the 70s.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'd1000001-0000-4000-8000-000000000001'),
  ('e1000001-0000-4000-8000-00000000000f', '70s Motown & Soul', 'genre', 'Motown and soul of the 70s.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'd1000001-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 80's R&B
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-000000000010', '80s R&B', 'genre', '80s R&B and quiet storm.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'd1000001-0000-4000-8000-000000000002'),
  ('e1000001-0000-4000-8000-000000000011', '80s New Jack Swing', 'genre', 'New Jack Swing and 80s R&B.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'd1000001-0000-4000-8000-000000000002'),
  ('e1000001-0000-4000-8000-000000000012', '80s Soul & Ballads', 'genre', '80s soul and ballads.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000004', 'd1000001-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- 80's Reggae
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-000000000013', '80s Reggae', 'genre', 'Roots, dub, and dancehall from the 80s.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'd1000001-0000-4000-8000-000000000002'),
  ('e1000001-0000-4000-8000-000000000014', '80s Lovers Rock & Dub', 'genre', 'Lovers rock and dub from the 80s.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'd1000001-0000-4000-8000-000000000002'),
  ('e1000001-0000-4000-8000-000000000015', '80s Dancehall', 'genre', 'Early dancehall and rub-a-dub.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'd1000001-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- 90's Reggae
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-000000000016', '90s Reggae', 'genre', '90s reggae and conscious dancehall.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'd1000001-0000-4000-8000-000000000003'),
  ('e1000001-0000-4000-8000-000000000017', '90s Dancehall', 'genre', '90s dancehall and reggae fusion.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'd1000001-0000-4000-8000-000000000003'),
  ('e1000001-0000-4000-8000-000000000018', '90s Roots & Modern Roots', 'genre', '90s roots and modern roots reggae.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'b1000001-0000-4000-8000-000000000003', 'd1000001-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- 80's Pop
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-000000000019', '80s Pop', 'genre', 'Synth-pop and 80s pop hits.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000006', 'd1000001-0000-4000-8000-000000000002'),
  ('e1000001-0000-4000-8000-00000000001a', '80s Pop Anthems', 'genre', 'Chart-topping 80s pop.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000006', 'd1000001-0000-4000-8000-000000000002'),
  ('e1000001-0000-4000-8000-00000000001b', '80s New Wave Pop', 'genre', 'New wave and synth-pop from the 80s.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'b1000001-0000-4000-8000-000000000006', 'd1000001-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- 90's Pop
INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id) VALUES
  ('e1000001-0000-4000-8000-00000000001c', '90s Pop', 'genre', '90s pop, boy bands, and pop princesses.', 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400', 'b1000001-0000-4000-8000-000000000006', 'd1000001-0000-4000-8000-000000000003'),
  ('e1000001-0000-4000-8000-00000000001d', '90s Pop Hits', 'genre', 'Chart-topping 90s pop.', 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400', 'b1000001-0000-4000-8000-000000000006', 'd1000001-0000-4000-8000-000000000003'),
  ('e1000001-0000-4000-8000-00000000001e', '90s Teen Pop', 'genre', '90s teen pop and bubblegum.', 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400', 'b1000001-0000-4000-8000-000000000006', 'd1000001-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;
