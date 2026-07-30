-- Prize wheel segments for stage broadcast (json array of { label, color?, weight? })
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS wheel_segments jsonb DEFAULT NULL;

COMMENT ON COLUMN public.games.wheel_segments IS 'Stage prize wheel segments: [{ "label": "Free Drink", "color": "#00FFFF", "weight": 1 }]';
