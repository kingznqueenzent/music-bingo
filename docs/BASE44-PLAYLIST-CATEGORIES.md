# Base44: Playlist categories workflow

Playlist categories are shown **in order by year + genre**, with no duplicates.

## Category order (fixed)

1. **70's Rock**
2. **80's Rock**
3. **90's Rock**
4. **2000's Rock**
5. **70's R&B**
6. **80's R&B**
7. **80's Reggae**
8. **90's Reggae**
9. **80's Pop**
10. **90's Pop**

Themes that don’t match any of these (e.g. no `era_id`/`genre_id` or different era/genre) appear under **Other**.

## Setup (one-time)

1. Run **Supabase SQL Editor**:
   - `supabase/RUN-FULL-SETUP.sql` (or existing schema with `themes`, `genres`, `eras`).
   - `supabase/seed-base44-categories.sql` (adds 70s/80s/90s/2000s eras, ensures Rock/R&B/Reggae/Pop genres, and inserts themes per category).

2. Add songs to themes via **Media Manager** or **YouTube import** (Host → Import YouTube) so each theme has enough tracks for a game (e.g. 25+ for 5×5 bingo).

## No duplicates

- **Eras**: Fixed UUIDs for 70s, 80s, 90s, 2000s; `ON CONFLICT (id) DO UPDATE` so re-running the seed doesn’t create duplicate eras.
- **Genres**: Same for Rock, R&B & Soul, Reggae, Pop.
- **Themes**: Each theme in the seed has a **unique name** and fixed `id`; `ON CONFLICT (id) DO NOTHING` (or `DO UPDATE`) avoids duplicate theme rows when re-running.

## Adding more themes

- In **Supabase Table Editor** → `themes`: insert new rows with `genre_id` and `era_id` set to one of the base44 genres/eras so they show under the right category.
- Or run extra SQL that inserts into `themes` with the same `genre_id`/`era_id` UUIDs from `seed-base44-categories.sql` (see comments there for IDs).

## App behavior

- **Playlists** page groups themes by **(era, genre)** and renders sections in the order above.
- **Filter bar** (Genre / Era) still filters the list; the order of sections stays the same.
