# Supabase keys – where to paste them

## 1. In Supabase (you do this once)

1. Open your project → **Project Settings** (gear) → **API**.
2. Under **"Publishable and secret API keys"**:
   - **anon / public** (publishable) → copy the value.
   - **service_role** → click **Reveal**, then copy the value.

## 2. In this project (.env.local)

1. Open **`.env.local`** in the project root.
2. Set these two (paste your copied values after the `=`):

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=paste_service_role_key_here
```

Keep **NEXT_PUBLIC_SUPABASE_URL** as is (already set).

Save the file.

## 3. On Vercel

1. **Vercel** → your music-bingo project → **Settings** → **Environment Variables**.
2. Add or edit (use the **same** values as in `.env.local`):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Project URL from Supabase API page |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **anon/public** key you copied |
| `SUPABASE_SERVICE_ROLE_KEY` | The **service_role** key you copied (after Reveal) |

3. Save, then **Deployments** → **⋯** → **Redeploy**.

## 4. Verify

From the project root run:

```bash
node scripts/verify-and-vercel-checklist.js
```

You should see the anon key test as **OK** and both keys **set**. Then your live `/host` URL should work after redeploy.
