-- player_profiles: links Supabase Auth users to LyricGrid roles (admin drawer, sitemap guard)

CREATE TABLE IF NOT EXISTS public.player_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT DEFAULT 'Host / Admin',
  role TEXT DEFAULT 'admin',
  is_admin BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles read" ON public.player_profiles;
CREATE POLICY "Public profiles read" ON public.player_profiles
  FOR SELECT USING (true);

-- Sync configured admin user from auth.users
INSERT INTO public.player_profiles (id, email, role, is_admin)
SELECT id, email, 'admin', true
FROM auth.users
WHERE email = 'ykingzandqueenzentertainment@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin', is_admin = true, email = EXCLUDED.email;

COMMENT ON TABLE public.player_profiles IS 'LyricGrid player/host profile linked to auth.users; drives admin nav and role checks';
