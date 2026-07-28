# Kingz & Queenz Entertainment — Project README

Official online presence for **Kingz & Queenz Entertainment** (Brantford, ON) — premium DJ services by DJ Liz & DJ Merci.

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

## Folder Structure

```
public/assets/
  logo/                 Official logo + variants
  images/
    dj-merci/           DJ Merci photos (descriptive filenames)
    dj-liz/             DJ Liz photos
    events/             weddings | birthdays | corporate | clubs
    gallery/            Curated site gallery
    backgrounds/        Hero & textures
    social/             OG / Twitter share images
  raw/                  High-res masters — NEVER used on the live site
  videos/               Promo & highlight reels
  merch/                Future product photography
  icons/ fonts/

config/
  site-config.js        ALL business links & asset paths (edit here only)
  seo/                  SEO placeholders

components/kingz/       Reusable DJ site sections
styles/kingz.css        Design system
lib/kingz/              Data, logo, integrations wrappers
scripts/                Asset prep utilities
CHANGELOG.md            Version history
```

In Next.js, `public/assets/...` is served as `/assets/...`.

---

## Replacing the Logo

1. Export official files into `public/assets/logo/`
2. **Primary:** `logo-main.png` (do not crop or distort)
3. Also add when available:
   - `logo-transparent.png`
   - `logo-white.png` · `logo-gold.png` · `logo-black.png`
   - `logo-horizontal.png` · `logo-compact.png`
   - `logo-monogram.png` · `logo-crown.png`
   - `favicon.ico` · `apple-touch-icon.png`
4. Paths live in `config/site-config.js` → `assets.logo`
5. Component: `components/kingz/KingzLogo.tsx` (responsive, aspect-ratio locked)

---

## Replacing DJ Photos

**DJ Merci** → `public/assets/images/dj-merci/`

- `dj-merci-profile.jpg`
- `dj-merci-hero.jpg`
- `dj-merci-live-stage.jpg`
- `dj-merci-event.jpg`

**DJ Liz** → `public/assets/images/dj-liz/`

- `dj-liz-profile.jpg`
- `dj-liz-hero.jpg`
- `dj-liz-live-stage.jpg`
- `dj-liz-event.jpg`

Keep camera originals in `public/assets/raw/`. Only optimized web JPGs go in `images/`.

Code comments mark each image: `{/* Replace with Professional Photo of DJ Merci */}`.

---

## Replacing Videos

Drop files into `public/assets/videos/`:

| File | Purpose |
|------|---------|
| `promo-reel.mp4` | Brand promo |
| `wedding-highlights.mp4` | Wedding reel |
| `corporate-events.mp4` | Corporate reel |
| `club-performances.mp4` | Club / nightlife |
| `behind-the-scenes.mp4` | BTS content |

Paths: `config/site-config.js` → `assets.videos`.

---

## Updating Social Links

Edit **only** `config/site-config.js` → `social`:

Instagram · Facebook · TikTok · YouTube · Mixcloud · SoundCloud · Twitch · Kick

---

## Updating Patreon

`config/site-config.js` → `support.patreon`  

Status: **Coming Soon** until a real URL is pasted (buttons stay disabled).

---

## Updating Buy Me a Coffee

`config/site-config.js` → `support.buyMeACoffee`  

Same Coming Soon behavior until activated.

---

## Launching Merchandise

1. Add product photos to `public/assets/merch/`
2. Paste storefront URL in `config/site-config.js` → `merch.storeUrl`
3. When ready (not yet): Printify / Printful / Shopify / Stripe under `merch.*`
4. UI: `components/kingz/KingzMerchHub.tsx` — marked **Coming Soon** until URLs are live

Do **not** hardcode temporary checkout systems.

---

## Deploying to Vercel

```bash
npm run build
```

1. Connect the repo to Vercel
2. Set env vars: `NEXT_PUBLIC_KINGZ_SITE_URL`, `RESEND_API_KEY` (contact form)
3. Deploy — homepage is the DJ site (`/`)

See also: `docs/VERCEL-PRE-PRODUCTION.md` if using staging.

---

## Future Features (Coming Soon)

Configured in `config/site-config.js` → `futureIntegrations` — **not activated**:

- Patreon · Buy Me a Coffee
- Printify · Printful · Royal Collection Merch
- Google Reviews · Google Calendar Booking · Stripe Deposits
- YouTube Channel · Instagram Feed · TikTok Feed
- Newsletter Signup · Blog · Podcast
- Google Analytics · Meta Pixel

---

## Local Development

```bash
npm run dev
```

Open http://localhost:3000

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history (1.0 → 1.4+).
