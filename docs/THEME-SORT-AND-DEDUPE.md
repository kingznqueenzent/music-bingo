# Theme list sort order

Themes are ordered **everywhere in the app** using `sortThemesChronologicalThenGenre()` in `lib/sort-themes.ts`:

1. **Era** — chronological, using `eras.sort_order` then `eras.start_year` (60s → 70s → … → 2020s; themes with **no `era_id` last**).
2. **Genre** — alphabetically by genre **name** within each era (`genres` join).
3. **Theme** — alphabetically by theme **name** within each era+genre.

You do **not** need a `display_order` column on `themes` for this behavior; sorting is derived from `themes` + `eras` + `genres`.

Ensure every theme has correct `era_id` and `genre_id` in Supabase so order is stable.

---

## Duplicate themes (cleanup)

Duplicates with the same display name (e.g. two “80’s Dancehall”) confuse hosts and imports.

1. **Find duplicates** — run `supabase/sql/find-duplicate-themes.sql` in the SQL Editor.
2. **Merge manually** (example strategy):
   - Pick one `theme.id` to keep (usually the oldest or the one with more `theme_songs`).
   - `UPDATE theme_songs SET theme_id = '<keep_id>' WHERE theme_id = '<drop_id>';`
   - `UPDATE games SET theme_id = '<keep_id>' WHERE theme_id = '<drop_id>';` (if any).
   - `UPDATE media_library SET theme_id = '<keep_id>' WHERE theme_id = '<drop_id>';` (if any).
   - `DELETE FROM public.themes WHERE id = '<drop_id>';`
3. Repeat for each duplicate pair.

Always **back up** or test on a branch before bulk deletes.
