# Merchandise product images

Official shop (customer checkout):
→ `config/site-config.js` → `merch.etsyStore`
→ https://www.etsy.com/shop/StrictlyShopping

## Adding featured products
1. Export real product photos to this folder (optimized web JPG/WebP).
2. Add an entry to `FEATURED_MERCH_PRODUCTS` in `lib/kingz/merch.ts` with:
   - `name` — exact product name from Etsy
   - `image` — `/assets/merch/your-file.jpg`
   - `etsyUrl` — direct Etsy listing URL

Do **not** invent products, prices, reviews, ratings, inventory, or discounts.
Do **not** link Printify, Printful, or Shopify storefronts.
