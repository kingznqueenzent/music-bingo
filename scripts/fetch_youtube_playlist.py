"""
Fetch up to 60 video IDs from a YouTube playlist and print SQL INSERTs
for public.theme_songs. Uses YouTube Data API v3.

Prerequisites: pip install requests

Usage:
  set YOUTUBE_API_KEY=your_key
  python scripts/fetch_youtube_playlist.py <theme_id> <playlist_id>

Example:
  python scripts/fetch_youtube_playlist.py a1000000-0000-0000-0000-000000000001 PLrAXerErn2T...

Playlist ID: from URL https://www.youtube.com/playlist?list=PLxxx - use the part after list=
"""
import os
import sys

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)

THEME_ID = sys.argv[1] if len(sys.argv) > 1 else None
PLAYLIST_ID = sys.argv[2] if len(sys.argv) > 2 else None
API_KEY = os.environ.get("YOUTUBE_API_KEY")
MAX_VIDEOS = 60
PAGE_SIZE = 50

if not THEME_ID or not PLAYLIST_ID:
    print("Usage: python fetch_youtube_playlist.py <theme_id> <playlist_id>", file=sys.stderr)
    print("Example: python fetch_youtube_playlist.py a1000000-0000-0000-0000-000000000001 PLrAXerErn2T...", file=sys.stderr)
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
    print(f"Only {len(videos)} videos. Need at least 25 for bingo.", file=sys.stderr)
    sys.exit(1)

print("-- Paste this into Supabase SQL Editor (theme_songs for theme " + THEME_ID + ", " + str(len(videos)) + " songs)")
print("INSERT INTO public.theme_songs (theme_id, youtube_id, title, position) VALUES")
rows = [f"  ({escape_sql(THEME_ID)}, {escape_sql(v)}, {escape_sql(t)}, {i})" for i, (v, t) in enumerate(videos)]
print(",\n".join(rows) + ";")
