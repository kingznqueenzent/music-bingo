/**
 * Kingz & Queenz Entertainment — official logo assets
 *
 * Directory: public/assets/logo/
 * Config:    config/site-config.js → assets.logo
 *
 * ACTIVE (do not distort — preserve aspect ratio):
 *   logo-main.png          Full-color official logo (Hero, Nav, Footer)
 *   logo-transparent.png   Transparent full-color (same master for overlays)
 *
 * PLACEHOLDERS — replace with official exports later:
 *   logo-white.png
 *   logo-gold.png
 *   logo-black.png
 *   logo-horizontal.png
 *   logo-compact.png
 *   logo-monogram.png      Lettermark / initials
 *   logo-crown.png         Crown-only icon
 *   favicon.ico
 *   apple-touch-icon.png
 *
 * FUTURE:
 *   logo.svg               Vector master
 */

import siteConfig from '@/config/site-config'

const logo = siteConfig.assets.logo

export const KINGZ_LOGO = {
  full: logo.main,
  main: logo.main,
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
  /** Intrinsic aspect ratio of logo-main.png — never crop or stretch */
  width: 1200,
  height: 1600,
  alt: 'Kingz & Queenz Entertainment',
} as const
