/** Keys must match `public.feature_flags.key` and seed migration */
export const FEATURE_FLAG_KEYS = [
  'b2b_white_label',
  'host_analytics',
  'venue_packages',
  'paid_entry_games',
  'sponsor_integration',
  'premium_player_pass',
  'tournaments',
  'xp_and_badges',
  'community_chat',
] as const

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number]
