-- =============================================================================
-- SEED THEMES (run in Supabase SQL Editor)
-- =============================================================================
-- 1. Run this entire file in SQL Editor (New query → paste → Run).
-- 2. Then use the script to fetch 60 YouTube video IDs from a playlist and
--    generate theme_songs INSERTs (see scripts/README-youtube.md).
-- =============================================================================

-- Ensure themes has description and artwork_url (in case table was created without them)
ALTER TABLE public.themes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.themes ADD COLUMN IF NOT EXISTS artwork_url text;

-- Insert theme rows. Copy the id for each theme from the table after running
-- (Table Editor → themes) to use with the fetch-youtube-playlist script.

INSERT INTO public.themes (id, name, category, description, artwork_url)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    '90s Hits',
    'decade',
    'Classic 90s hits. Pop, rock, and hip-hop from the decade.',
    'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    '2000s Hits',
    'decade',
    'Y2K and mid-2000s bangers.',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    '80s Throwback',
    'decade',
    'Synth pop, hair metal, and 80s anthems.',
    'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    'Pop Anthems',
    'genre',
    'Chart-topping pop from any era.',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    'Rock & Alternative',
    'genre',
    'Rock, grunge, and alternative hits.',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    'Hip-Hop & R&B',
    'genre',
    'Hip-hop and R&B classics.',
    'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000007',
    'Party Mode',
    'mood',
    'High-energy party and dance tracks.',
    'https://images.unsplash.com/photo-1545128485-c400e7702796?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000008',
    'Chill Vibes',
    'mood',
    'Laid-back and chill tracks.',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000009',
    'Reggae',
    'genre',
    'Classic reggae and roots. Bob Marley, Peter Tosh, and more.',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000010',
    'Dancehall Reggae',
    'genre',
    'Dancehall riddims and modern reggae vibes.',
    'https://images.unsplash.com/photo-1571266028243-d220e8d4a2a3?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000011',
    'Country Music',
    'genre',
    'Country classics and modern Nashville hits.',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000012',
    'Throwbacks',
    'mood',
    'All-era throwbacks and nostalgia hits.',
    'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000013',
    'Jazz',
    'genre',
    'Jazz standards, smooth jazz, and fusion.',
    'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400'
  )
ON CONFLICT (id) DO NOTHING;
