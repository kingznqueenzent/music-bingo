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

## 2. Spotify (disabled)

Spotify is **not used** in this app. Media Manager only supports **Upload file** (MP3/MP4) and **Indexed media**. The database still has `spotify_track_id` and `album_art_url` columns so existing Spotify library entries can be played if any were added earlier; no new Spotify tracks can be added.

---

## 3. Database migration (Spotify columns)

Run in Supabase SQL Editor (after your main schema):

- **File:** `supabase/migrations/spotify-and-admin.sql`

This adds `spotify_track_id` and `album_art_url` to `media_library` and `playlist_songs`, and allows `source = 'spotify'` and `file_type = 'spotify'`.
