/**
 * Kingz & Queenz logo paths — public/assets/logo/
 * ACTIVE: logo-main.png (official crest)
 * PLACEHOLDERS for later: transparent, white, gold, black, horizontal, compact, monogram, crown
 */

import siteConfig from '@/config/site-config'

const logo = siteConfig.assets.logo

export const KINGZ_LOGO = {
  full: logo.mainWebp || logo.main,
  main: logo.mainWebp || logo.main,
  transparent: logo.transparent,
  white: logo.white,
  gold: logo.gold,
  black: logo.black,
  horizontal: logo.horizontal,
  compact: logo.compact,
  monogram: logo.monogram,
  crown: logo.crown,
  favicon: logo.favicon,
  appleTouchIcon: logo.appleTouchIcon,
  /** Official logo-main is 1200×1200 — never crop or distort */
  width: 1200,
  height: 1200,
  alt: 'Kingz & Queenz Entertainment',
} as const
