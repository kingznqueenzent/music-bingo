# Vercel environment variables – copy & paste reference

In your Vercel project: **Settings → Environment Variables**, add the variables below.  
Copy each **Name** exactly; for **Value**, use the value from Supabase (or your local `.env.local`).

**Important:** If you see `Invalid API key` or **/host** shows invalid on the live site:
1. **Vercel** → your project → **Settings** → **Environment Variables**. Ensure **Production** (and Preview if needed) are checked for each variable.
2. Use the **anon public** key only for `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the **service_role** (Reveal) key only for `SUPABASE_SERVICE_ROLE_KEY`. Get both from Supabase → **Project Settings** → **API**. Do not swap them.
3. **Redeploy**: Deployments → open the **⋯** on the latest deployment → **Redeploy** (so new env vars are used).
4. If you use the admin guard (`ADMIN_EMAIL` / `ADMIN_SECRET`), open **/admin-login** first, sign in, then go to **/host**.

---

## 1. NEXT_PUBLIC_SUPABASE_URL

**Name (copy exactly):**
```
NEXT_PUBLIC_SUPABASE_URL
```
**Value:** Supabase → **Project Settings → API** → **Project URL** (e.g. `https://xxxxx.supabase.co`)

---

## 2. NEXT_PUBLIC_SUPABASE_ANON_KEY

**Name (copy exactly):**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
**Value:** Supabase → **Project Settings → API** → **Project API keys** → **anon** (the **public** / publishable key — not the service_role secret)

---

## 3. SUPABASE_SERVICE_ROLE_KEY

**Name (copy exactly):**
```
SUPABASE_SERVICE_ROLE_KEY
```
**Value:** Supabase → **Project Settings → API** → **service_role** → click **Reveal** and copy the **secret** key (do not use the anon key here)

---

## 4. DATABASE_URL (optional)

**Name (copy exactly):**
```
DATABASE_URL
```
**Value:** Supabase → **Project Settings → Database** → **Connection string** (URI format). Only needed if you use themed playlists with direct Postgres.

---

## One block (names only – for reference)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

Paste each name into Vercel, then fill the value from Supabase.  
After saving, **redeploy** the project so the new env vars are used.

---

## Using the Vercel CLI

**1. Install and link (one time)**

```bash
npm i -g vercel
cd "c:\Users\archi\OneDrive\Desktop\music-bingo"
vercel link
```

When prompted, choose your team and the **music-bingo** project.

**2. Add each variable (you’ll be prompted to paste the value)**

Run each command. When it asks for the value, paste from Supabase, then press Enter.

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add DATABASE_URL production
```

**3. Redeploy** so the new env vars are used (Vercel dashboard → Deployments → Redeploy, or push a new commit).
