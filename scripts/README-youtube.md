# Seeding themes and fetching YouTube playlists

## Part 1: Seed themes in Supabase (step-by-step)

1. **Open your Supabase project**  
   Go to [supabase.com/dashboard](https://supabase.com/dashboard) and open the project you use for Music Bingo.

2. **Open the SQL Editor**  
   In the left sidebar, click **SQL Editor** → **New query**.

3. **Paste the theme seed**  
   Open the file **`supabase/seed-themes.sql`** in your project. Copy its entire contents and paste them into the SQL Editor.

4. **Run the query**  
   Click **Run** (or press Ctrl+Enter). You should see a success message and no errors.

5. **Get theme IDs**  
   - Click **Table Editor** in the left sidebar.  
   - Open the **themes** table.  
   - You’ll see 8 themes (90s Hits, 2000s Hits, 80s Throwback, Pop Anthems, Rock & Alternative, Hip-Hop & R&B, Party Mode, Chill Vibes).  
   - The **id** column for each row is the **theme_id** you’ll use in the script.  
   - The seed file uses fixed UUIDs, so you can use these directly:
     - 90s Hits: `a1000000-0000-0000-0000-000000000001`
     - 2000s Hits: `a1000000-0000-0000-0000-000000000002`
     - 80s Throwback: `a1000000-0000-0000-0000-000000000003`
     - Pop Anthems: `a1000000-0000-0000-0000-000000000004`
     - Rock & Alternative: `a1000000-0000-0000-0000-000000000005`
     - Hip-Hop & R&B: `a1000000-0000-0000-0000-000000000006`
     - Party Mode: `a1000000-0000-0000-0000-000000000007`
     - Chill Vibes: `a1000000-0000-0000-0000-000000000008`

6. **Refresh API schema (if you use REST)**  
   If your app reads themes via the Supabase client and tables were just created, run once in SQL Editor:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

---

## Part 2: Get a YouTube API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. Open **APIs & Services** → **Library** → search for **YouTube Data API v3** → **Enable**.
4. Open **APIs & Services** → **Credentials** → **Create credentials** → **API key**.
5. Copy the API key and keep it private (e.g. in `.env` or environment variables, not in git).

---

## Part 3: Find a YouTube playlist ID

1. On YouTube, open a playlist (e.g. “90s Hits” or “Top 100 90s Songs”).
2. The URL looks like: `https://www.youtube.com/playlist?list=PLrAXerErn2T...`
3. The **playlist ID** is the part after `list=` (e.g. `PLrAXerErn2Tl2c3d2_2Fk_6F_EKdF`).

---

## Part 4: Run the script to fetch 60 video links

The script uses the **YouTube Data API v3** to fetch up to 60 videos from a playlist and prints **SQL INSERT** statements for `theme_songs`.

1. **Set your API key** (one-time per terminal session):
   - Windows (PowerShell): `$env:YOUTUBE_API_KEY="your_api_key_here"`
   - Windows (CMD): `set YOUTUBE_API_KEY=your_api_key_here`
   - Mac/Linux: `export YOUTUBE_API_KEY=your_api_key_here`

2. **Run the script** from the project root:
   ```bash
   node scripts/fetch-youtube-playlist.js <theme_id> <playlist_id>
   ```
   Example for “90s Hits” with a real playlist ID:
   ```bash
   node scripts/fetch-youtube-playlist.js a1000000-0000-0000-0000-000000000001 PLrAXerErn2Tl2c3d2_2Fk_6F_EKdF
   ```
   Replace `PLrAXerErn2Tl2c3d2_2Fk_6F_EKdF` with your actual playlist ID.

3. **Copy the output**  
   The script prints a single `INSERT INTO public.theme_songs ...` statement.

4. **Paste into Supabase**  
   SQL Editor → New query → paste the printed SQL → **Run**.

5. **Repeat for other themes**  
   Use the same script with different theme IDs and playlist IDs for 2000s, Pop, Party, etc.

---

## Optional: Python version

If you prefer Python, you can use this script instead. It requires the `requests` library (`pip install requests`).

Save as `scripts/fetch_youtube_playlist.py`:

```python
import os
import sys
import requests

THEME_ID = sys.argv[1] if len(sys.argv) > 1 else None
PLAYLIST_ID = sys.argv[2] if len(sys.argv) > 2 else None
API_KEY = os.environ.get("YOUTUBE_API_KEY")
MAX_VIDEOS = 60
PAGE_SIZE = 50

if not THEME_ID or not PLAYLIST_ID:
    print("Usage: python fetch_youtube_playlist.py <theme_id> <playlist_id>", file=sys.stderr)
    sys.exit(1)
if not API_KEY:
    print("Set YOUTUBE_API_KEY environment variable.", file=sys.stderr)
    sys.exit(1)

def escape_sql(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"

videos = []
next_page = None
while len(videos) < MAX_VIDEOS:
    url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {"part": "snippet", "playlistId": PLAYLIST_ID, "maxResults": PAGE_SIZE, "key": API_KEY}
    if next_page:
        params["pageToken"] = next_page
    r = requests.get(url, params=params)
    r.raise_for_status()
    data = r.json()
    for item in data.get("items", []):
        vid = item.get("snippet", {}).get("resourceId", {}).get("videoId")
        title = item.get("snippet", {}).get("title")
        if vid:
            videos.append((vid, title))
        if len(videos) >= MAX_VIDEOS:
            break
    next_page = data.get("nextPageToken") or ""
    if not next_page:
        break

if len(videos) < 25:
    print(f"Only {len(videos)} videos. Need at least 25.", file=sys.stderr)
    sys.exit(1)

print("-- theme_songs for theme", THEME_ID, f"({len(videos)} songs)")
print("INSERT INTO public.theme_songs (theme_id, youtube_id, title, position) VALUES")
rows = [f"  ({escape_sql(THEME_ID)}, {escape_sql(v)}, {escape_sql(t)}, {i})" for i, (v, t) in enumerate(videos)]
print(",\n".join(rows) + ";")
```

Run it the same way:
```bash
set YOUTUBE_API_KEY=your_key
python scripts/fetch_youtube_playlist.py a1000000-0000-0000-0000-000000000001 PLrAXerErn2T...
```

Then paste the printed SQL into Supabase SQL Editor and run it.
