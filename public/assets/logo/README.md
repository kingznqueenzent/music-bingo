# Logo assets — Kingz & Queenz Entertainment

## Active (use these)

| File | Use |
|------|-----|
| `logo-main.png` | **Official crest** — nav, hero, footer, Open Graph / Twitter |
| `favicon.png` | Browser tab icon (metadata) |
| `apple-touch-icon.png` | iOS home screen (official crest) |

Do **not** modify, crop, or distort. Preserve 1:1 aspect ratio.

`logo-main.png` has a solid black background. It blends with the site’s black chrome until a genuine transparent master is supplied. Do **not** invent fake transparent exports.

## Same crest, not true alpha

| File | Notes |
|------|--------|
| `logo-transparent.png` | Same crest artwork; still black-backed — not a real alpha PNG |

## Not used on the live site

| File | Notes |
|------|--------|
| `logo-full.png` | Alternate lockup — do not substitute for the official crest |
| `logo.svg` | Text placeholder only — replace only with an official vector |
| `favicon.ico` | Empty placeholder — browsers use `favicon.png` via metadata |
| `logo-white.png`, `logo-gold.png`, `logo-black.png`, `logo-horizontal.png`, `logo-compact.png`, `logo-monogram.png`, `logo-crown.png` | Reserved slots for future **official** exports |

## Placement (target counts)

- Header / nav: **1**
- Hero: **1**
- Footer: **1**
- Loading screen: **0** (spinner only)

Paths: `config/site-config.js` → `assets.logo`  
Component: `components/kingz/KingzLogo.tsx`
