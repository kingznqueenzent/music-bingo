# Changelog — Kingz & Queenz Entertainment

All notable project updates are documented here.

---

## Version 1.5 — Launch update

**Real brand configuration (no redesign)**

- Canonical domain / SEO: `https://kingznqueenzent.ca` (`siteUrl`, robots, sitemap, OG, Organization JSON-LD)
- Official logo path locked: `/assets/logo/logo-main.png` (+ placeholder variant paths)
- Buy Me a Coffee live from config: `support.buyMeACoffee` → `https://buymeacoffee.com/kingznqueenzent`
- Merch live on Etsy: The Royal Collection → `merch.etsyStore` (StrictlyShopping); no customer-facing Shopify/Printify/Printful/Stripe merch
- Patreon remains configurable (`support.patreon` empty = Coming Soon)
- Removed stock/AI-style portrait stand-ins for DJ Merci & DJ Liz; branded photo placeholders only
- Removed fake testimonials / store-integration panels from the public page
- Asset folders: `raw/dj-*` masters, `images/dj-*` for optimized future photos only

---

## Version 1.0

**Initial Website Launch**

- Luxury single-page DJ website (Art Deco black / gold / purple)
- Sections: Hero, About, Services, Gallery, Team, Testimonials, Livestreams, Merch, Support, Booking, Contact
- GSAP scroll animations and responsive layout
- Contact API and booking calendar UI

---

## Version 1.1

**Official Logo Added**

- Official Kingz & Queenz Entertainment logo as `logo-main.png`
- Logo asset folder with white / gold / black / horizontal / compact / transparent placeholders
- Responsive logo component with glow (no crop or distortion)
- Brand palette locked to logo colors (`#D4AF37`, `#5A2D91`, `#6B0F1A`, `#050505`)

---

## Version 1.2

**Professional Asset Organization & DJ Photo Structure**

- Agency folder structure under `public/assets/`
- Descriptive image filenames (`dj-merci-profile.jpg`, `wedding-dancefloor.jpg`, etc.)
- `assets/raw/` for masters (never referenced on the live site)
- `assets/videos/` placeholders (promo, wedding, corporate, club, BTS)
- `config/site-config.js` as single source of truth for links
- SEO / analytics / newsletter placeholders
- Documentation: README-KINGZ.md, CHANGELOG.md

---

## Version 1.3

**Patreon Integration**

- Status: **Coming Soon**
- Placeholder in `config/site-config.js` → `support.patreon`
- UI buttons remain disabled until a live URL is pasted

---

## Version 1.4

**Royal Collection Merchandise Launch**

- Status: **Coming Soon**
- Merch hub + drops UI prepared
- Printify / Printful / Shopify / Stripe marked FUTURE — not activated
- Product images: `public/assets/merch/`

---

## Unreleased / Next

- Replace stand-in photos with official DJ Merci & DJ Liz photography
- Add real promo / highlight videos
- Activate Patreon & Buy Me a Coffee when URLs are ready
- Google Reviews, Calendar booking, newsletter, blog, podcast (Coming Soon)
