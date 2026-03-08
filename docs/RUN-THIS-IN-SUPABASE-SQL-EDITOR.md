# Fix "theme_id" / schema cache – run in Supabase

**Do this once** in your Supabase project, then **restart the project**.

---

## Option A – Fix only theme_id (recommended if you only see the media_library error)

**File to copy:** `supabase/fix-media-library-theme-id.sql`

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** → your project.
2. **SQL Editor** → **New query**.
3. Open **`supabase/fix-media-library-theme-id.sql`** in your repo, copy **all** of it, paste into the editor, click **Run**.
4. **Important:** Go to **Project Settings** → **General** → **Restart project**. Wait ~1 minute.
5. Try Media Manager again: https://music-bingo-kingzandqueenzentertainment-1662s-projects.vercel.app/media

---

## Option B – Full schema reload (games, cards, media_library)

**File to copy:** `supabase/reload-schema-cache.sql`

1. Supabase Dashboard → **SQL Editor** → **New query**.
2. Copy the **entire** contents of **`supabase/reload-schema-cache.sql`**, paste, **Run**.
3. **Project Settings** → **General** → **Restart project**. Wait ~1 minute.
4. Try the app again.

---

**If the error still appears:** Restart the project again and wait 2 minutes; the schema cache can be slow to clear.
