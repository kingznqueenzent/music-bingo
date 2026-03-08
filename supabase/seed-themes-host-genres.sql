-- Add host genres: 80's Rock, 2000's Dancehall, Afrobeats (2010–2026). Safe to run multiple times.
INSERT INTO public.themes (id, name, category, description, artwork_url)
VALUES
  (
    'a1000000-0000-0000-0000-000000000017',
    '80''s Rock',
    'decade',
    '80s rock through 2026 — hair metal, arena rock, and 80s anthems.',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000018',
    '2000''s Dancehall',
    'decade',
    '2000s dancehall through 2026 — riddims, bashment, and modern dancehall.',
    'https://images.unsplash.com/photo-1571266028243-d220e8d4a2a3?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000019',
    'Afrobeats (2010–2026)',
    'genre',
    'Afrobeats from 2010 through 2026 — Afropop, Afrobeats, and African pop.',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400'
  )
ON CONFLICT (id) DO NOTHING;
