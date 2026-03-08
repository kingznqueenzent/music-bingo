# Admin guard and Spotify

## 1. Admin-only access (optional)

To restrict **Host** and **Media Manager** to a single admin email:

1. Set in `.env.local` (and in Vercel if deployed):
   - `ADMIN_EMAIL` = the only email allowed (e.g. `your@email.com`)
   - `ADMIN_SECRET` = a password only you know

2. Anyone visiting `/host` or `/media` is redirected to `/admin-login` unless they have a valid admin cookie.

3. On `/admin-login`, enter the **exact** `ADMIN_EMAIL` and `ADMIN_SECRET`. A cookie is set and you can access `/host` and `/media`. The cookie lasts 7 days.

4. If `ADMIN_EMAIL` or `ADMIN_SECRET` is not set, the guard is off and everyone can access Host and Media Manager.

**Routes:**
- **Admin-only:** `/host`, `/host/*`, `/media`, `/media/*`
- **Everyone:** `/`, `/join`, `/play`, `/stage/*`, `/playlists`, `/admin-login`

---

## 2. Spotify (removed)

Spotify is **not used** in this app. The UI, API routes, and playlist creation only support **YouTube** and **Media Library** (MP3/MP4). The database may still have `spotify_track_id` columns from older migrations; they are unused. No Spotify search or embed is available.

---

## 3. Database migration (admin + optional columns)

Run in Supabase SQL Editor (after your main schema):

- **File:** `supabase/migrations/spotify-and-admin.sql`

This adds admin-related options and, if present, `spotify_track_id` / `album_art_url` columns. The app does not use Spotify; those columns are legacy.
