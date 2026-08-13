# Kingz & Queenz Entertainment — Project README

Official online presence for **Kingz & Queenz Entertainment** (Brantford, ON) — premium DJ services by DJ Liz & DJ Merci.

**Production domain:** [https://kingznqueenzent.ca](https://kingznqueenzent.ca)

This is a production-level, agency-organized codebase designed to grow for years without restructuring.

---

## Project Overview

| URL | Site |
|-----|------|
| `/` | Kingz & Queenz Entertainment (DJ brand website) |
| `/lyricgrid` | LyricGrid music bingo (separate product) |

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · GSAP  

**Brand colors:** Gold `#D4AF37` · Purple `#5A2D91` · Burgundy `#6B0F1A` · Background `#050505`

---

## Central configuration

Edit **only** `config/site-config.js` for:

- `siteUrl` — canonical domain (`https://kingznqueenzent.ca`)
- `merch.etsyStore` — Royal Collection on Etsy
- `support.buyMeACoffee` — Buy Me a Coffee
- `support.patreon` — Become Royalty memberships
- Social, contact, logo/image paths, SEO defaults

Components read these via `lib/kingz/integrations.ts` and related modules — do not hardcode URLs in UI.

---

## Folder Structure

```
public/assets/
  logo/                 Official logo + variants (placeholders OK)
  images/
    dj-merci/           Profile photo when ready → profile.jpg
    dj-liz/             Profile photo when ready → profile.jpg
    events/             Event atmosphere photography
    gallery/            Curated site gallery
    backgrounds/        Hero & textures
    social/             OG / Twitter share images
  raw/                  High-res masters — NEVER served on the live site
    dj-merci/  dj-liz/
  videos/               Promo & highlight reels
  merch/                Future real product photography

config/
  site-config.js        ALL business links & asset paths
  seo/

components/kingz/       Brand site sections
styles/kingz.css        Design system
lib/kingz/              Data, logo, merch, integrations
```

In Next.js, `public/assets/...` is served as `/assets/...`.

---

## Logo

1. Primary file: `public/assets/logo/logo-main.png` (do not crop or distort)
2. Placeholders already path-mapped for:
   - `logo-transparent.png` · `logo-horizontal.png` · `logo-compact.png`
   - `logo-monogram.png` · `favicon.png` · other variants
3. Paths: `config/site-config.js` → `assets.logo`
4. Component: `components/kingz/KingzLogo.tsx` (aspect-ratio locked)

---

## DJ Photos

Until real professional photographs are provided, UI uses branded **KingzDjPlaceholder** (black / gold / purple — never stock or AI faces).

**When ready:**

| Person | Optimized web path | Raw originals |
|--------|--------------------|---------------|
| DJ Merci | `/assets/images/dj-merci/profile.jpg` | `raw/dj-merci/` |
| DJ Liz | `/assets/images/dj-liz/profile.jpg` | `raw/dj-liz/` |

Never serve `/assets/raw/` on production.

---

## Merch (The Royal Collection)

- Live store: Etsy URL in `site-config` → `merch.etsyStore`
- Site section: `#merch` ("Wear the Sound. Represent the Kingdom.")
- CTAs open Etsy in a new tab (`target="_blank"` `rel="noopener noreferrer"`)
- No Printify, Printful, Shopify, or Stripe merch checkout on the customer-facing site
- Category cards only until real product images/links are supplied

---

## Support

| Channel | Config key | Status |
|---------|------------|--------|
| Buy Me a Coffee | `support.buyMeACoffee` | Live |
| Patreon (Become Royalty) | `support.patreon` | Live |

---

## SEO

- Canonical / OG / sitemap host: `siteUrl` → `https://kingznqueenzent.ca`
- `app/robots.ts` · `public/sitemap.xml` (SEO XML; admin UI stays at `/sitemap`)
- Organization JSON-LD only (no invented ratings or awards)

---

## Navigation

Home · About · DJs · Services · Videos · Royal Collection · Support · Book Us · Contact
