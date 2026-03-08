# Vercel environment variables – checklist and fixes

I can't see your Vercel project. Use this to check and fix env vars yourself.

---

## If you get 401 Unauthorized on /host or the whole site

That’s **Vercel Deployment Protection**, not our app. The request is blocked before it reaches Next.js.

**Fix:**

1. In Vercel go to your **music-bingo** project → **Settings** → **Deployment Protection**.
2. Set protection to **None** (or turn off **Vercel Authentication**) so the deployment is publicly reachable.
3. Save. No redeploy needed for this change.

After that, `/host` and the rest of the site should load without 401. If you want to keep protection for some deployments, use **Protection Bypass for Automation** (bypass secret in headers) only for scripts; for normal browser use, disabling protection is the simplest fix.

---

## If you see "Could not find the table public.playlists" or schema cache

The database tables haven’t been created yet. Run the full setup **once** in Supabase:

**→ Open a NEW Supabase SQL query (use this URL exactly — it must end with /sql/new):**  
**https://supabase.com/dashboard/project/dmcjpkrdivafkqoovyvn/sql/new**  
(If you have a link ending in /sql/7552b4e8-... or similar, that’s a saved query; use the /sql/new link above for a blank editor.)

Then: open **`supabase/RUN-FULL-SETUP.sql`** in your project → copy all → paste in the SQL Editor → click **Run**.

Or from the project root: `node scripts/run-supabase-schema.js` (requires `DATABASE_URL` in .env.local with the correct database password).

**If you see "Could not find the 'playlist_id' column of 'games' in the schema cache"** — PostgREST’s cache is stale. Run **`supabase/reload-schema-cache.sql`** in the SQL Editor (same link above), then try again.

---

## If you see "Invalid API key" on live /host

That’s the **Supabase** key on Vercel. Do this:

1. **Get the correct values**  
   Open **Supabase** → your project → **Project Settings** → **API**. Copy:
   - **Project URL** → you’ll use this for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click **Reveal**) → for `SUPABASE_SERVICE_ROLE_KEY`  
   Don’t swap anon and service_role.

2. **Set them in Vercel**  
   **Vercel** → **music-bingo** → **Settings** → **Environment Variables**. Add or edit so you have exactly these three (names exactly as below):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key  
   No extra spaces; values are case-sensitive.

3. **Redeploy**  
   **Deployments** → **⋯** on the latest deployment → **Redeploy**. Wait for it to finish.

4. **Check**  
   Open `https://music-bingo-kingzandqueenzentertainment-1662s-projects.vercel.app/api/supabase-health`. You should see `{"ok":true,...}`. Then try **Create game & get link** on `/host` again.

**Or push from your machine:** If `.env.local` already has the correct URL, anon key, and service_role key, run:
`npm run vercel:env-push`
(from the project root; requires [Vercel CLI](https://vercel.com/docs/cli) and `npx vercel link` once). Then redeploy in Vercel.

---

## If you see "Invalid API key" (other places)

- **On /host, creating a game, Media Library, or Host Dashboard**  
  → Same as above: fix the three Supabase env vars in Vercel and redeploy.

- **Only when using “Import from playlist URL” on Import YouTube**  
  → It’s the **YouTube** API key.

  **Fix:** In Google Cloud Console create an API key, enable **YouTube Data API v3** for that key, then set `YOUTUBE_API_KEY` in .env.local and in Vercel. Or use **“Paste YouTube URLs”** on the same page — that path doesn’t need an API key.

---

## Required for /host and app to work (exact names, no typos)

| Variable name (copy exactly) | What to put | Common mistakes |
|-----------------------------|-------------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL, e.g. `https://dmcjpkrdivafkqoovyvn.supabase.co` | Wrong: pasting the **key** here. Must be the **URL** only. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **anon / public** key from Supabase (long string) | Wrong: using the service_role key here. Must be **anon** only. |
| `SUPABASE_SERVICE_ROLE_KEY` | The **service_role** key from Supabase (click Reveal, copy) | Wrong: using the anon key here. Must be **service_role** only. |

---

## Optional (only if you use them)

- `ADMIN_EMAIL` – same as in .env.local if you use admin login
- `ADMIN_SECRET` – same as in .env.local
- `DATABASE_URL` – only if you use themes with direct Postgres
- `YOUTUBE_API_KEY` – only for Import playlist
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` – we disabled Spotify; can leave empty

---

## How to edit or fix in Vercel

1. **Vercel** → your **music-bingo** project → **Settings** → **Environment Variables**.
2. **To fix a value:** Click the **⋯** or **Edit** next to the variable → change the value → Save.
3. **To remove a wrong one:** Click **⋯** → **Delete** → then **Add New** and re-add with the **exact name** and correct value.
4. **Typo in the name?** Delete the wrong one and add a new variable with the **exact** name from the table above (e.g. `NEXT_PUBLIC_SUPABASE_URL` has no space, and must start with `NEXT_PUBLIC_` for the two that do).
5. **After any change:** **Deployments** → **⋯** on latest → **Redeploy** (otherwise the old values stay in use).

---

## Names must match exactly

- `NEXT_PUBLIC_SUPABASE_URL` (not SUPABASE_URL, not NEXT_PUBLIC_SUPABASE_URLS)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not ANON_KEY, not SUPABASE_ANON_KEY)
- `SUPABASE_SERVICE_ROLE_KEY` (not SERVICE_ROLE_KEY, not SUPABASE_SERVICE_KEY)

No extra spaces before/after the name or value. Values are case-sensitive.

---

## Copy from .env.local

Your `.env.local` has the correct values. For each of the 3 required variables above, copy the **value** (the part after `=`) from the matching line in `.env.local` and paste it into Vercel. Don't include the variable name in the value; only the key or URL.
