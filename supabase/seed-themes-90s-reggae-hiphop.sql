-- Add 90's Reggae and 90's Hip-Hop themes. Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dmcjpkrdivafkqoovyvn/sql/new
-- Then go to Host → Import YouTube songs and choose the theme before adding URLs.

INSERT INTO public.themes (id, name, category, description, artwork_url)
VALUES
  (
    'a1000000-0000-0000-0000-000000000015',
    '90''s Reggae',
    'decade',
    '90s reggae and dancehall — roots, lovers rock, and 90s reggae vibes.',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400'
  ),
  (
    'a1000000-0000-0000-0000-000000000016',
    '90''s Hip-Hop',
    'decade',
    '90s hip-hop — golden era, East Coast, West Coast, and Southern rap from the decade.',
    'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400'
  )
ON CONFLICT (id) DO NOTHING;
