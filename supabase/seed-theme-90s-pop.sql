-- Add 90's Pop theme. Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dmcjpkrdivafkqoovyvn/sql/new
-- Then add songs via /host/import-youtube (choose "90's Pop" and paste YouTube URLs or import from a playlist).

INSERT INTO public.themes (id, name, category, description, artwork_url)
VALUES (
  'a1000000-0000-0000-0000-000000000014',
  '90''s Pop',
  'decade',
  '90s pop music — boy bands, pop princesses, and chart-topping hits from the decade.',
  'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400'
)
ON CONFLICT (id) DO NOTHING;
