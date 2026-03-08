# Fix: "Could not find the '…' column of 'games' or 'cards' in the schema cache"

PostgREST (Supabase’s API layer) is using an old schema cache and doesn’t see columns like `playlist_id`, `current_song_id` on `games`, or **`player_identifier`** on `cards`. If you see **player_identifier** when joining a game, run the SQL below then **restart the project** (Step 2).

## Step 1: Run the reload SQL

1. Open **Supabase SQL Editor** (new query):  
   **https://supabase.com/dashboard** → your project → **SQL Editor** → **New query**.

2. Paste and run the **entire** script below (games + cards columns, then reload cache).

3. Wait **20 seconds**, then try the app again.

```sql
-- Games
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES public.playlists(id) ON DELETE RESTRICT;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_song_id uuid REFERENCES public.playlist_songs(id) ON DELETE SET NULL;
-- Cards (fixes "player_identifier" / "player_name" when joining)
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS player_name text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS player_identifier text;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
```

## Step 2: If the error is still there — restart the project (required for player_identifier)

1. In Supabase go to **Project Settings** (gear icon in the sidebar).
2. Open the **General** tab.
3. Click **Restart project** (or Pause, then Restore).

Restarting forces PostgREST to reload the schema. After the project is back up, try joining the game again.
