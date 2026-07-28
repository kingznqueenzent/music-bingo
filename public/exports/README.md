# Base44 export files

Place Base44 entity exports here before running:

```bash
npm run db:migrate-base44
```

Expected filenames (any casing):

| File | Entity |
|------|--------|
| `Themes.json` or `themes.json` | Playlist categories / themes |
| `Songs.json` or `theme_songs.json` | Theme song rows (`theme_id`, `title`, …) |
| `MediaLibrary.json` or `media_library.json` | Uploaded MP3/MP4 catalog |
| `GameTemplates.json` | Optional — ignored unless rows include track data |

The migration script maps each row's `theme_id` to a human-readable genre bucket (Dancehall, Reggae, 80's Pop, …) using theme + genre + era names, then inserts into `public.bingo_game_tracks` (`game_id` NULL = shared catalog).

If this folder is empty, the script falls back to:

1. `scripts/seed-tracks-library.json` (60-track starter catalog)
2. Live `theme_songs` + `themes` from Supabase (when `DATABASE_URL` is set)
