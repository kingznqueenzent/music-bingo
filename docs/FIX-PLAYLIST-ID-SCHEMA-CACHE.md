# Fix: "Could not find the '…' column of 'games' in the schema cache"

PostgREST (Supabase’s API layer) is using an old schema cache and doesn’t see columns like `playlist_id` or `current_song_id` on `games`.

## Step 1: Run the reload SQL

1. Open **Supabase SQL Editor** (new query):  
   **https://supabase.com/dashboard/project/dmcjpkrdivafkqoovyvn/sql/new**

2. Paste and run the contents of **`supabase/reload-schema-cache.sql`** (or the SQL below). This adds `playlist_id` to `games` if it’s missing, then reloads the schema cache.

3. Wait **15–20 seconds**, then try the app again (e.g. create a game on `/host`).

```sql
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES public.playlists(id) ON DELETE RESTRICT;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_song_id uuid REFERENCES public.playlist_songs(id) ON DELETE SET NULL;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

## Step 2: If the error is still there — restart the project

1. In Supabase go to **Project Settings** (gear icon in the sidebar).
2. Open the **General** tab.
3. Click **Restart project** (or **Pause project**, wait for it to pause, then **Restore project**).

Restarting forces PostgREST to reload the schema. After the project is back up, try the app again.
