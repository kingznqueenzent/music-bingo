-- Per-account host subscription tier (Media Library / branding gates).
-- Env HOST_TIER remains a fallback when profile tier is unset.

ALTER TABLE public.player_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text
    CHECK (subscription_tier IS NULL OR subscription_tier IN ('free', 'pro', 'enterprise'));

ALTER TABLE public.player_profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.player_profiles.subscription_tier IS
  'Host account tier: free | pro | enterprise. NULL = fall back to HOST_TIER env.';

-- Promote primary host account to Pro (Media Library access).
UPDATE public.player_profiles
SET
  subscription_tier = 'pro',
  updated_at = NOW()
WHERE email ILIKE 'kingzandqueenzentertainment@gmail.com';

NOTIFY pgrst, 'reload schema';
