# Base44 export files

Place Base44 entity exports here before running:

```bash
npm run db:migrate-legacy
```

Expected filenames (any casing):

| File | Entity |
|------|--------|
| `Themes.json` / `Theme.json` | Playlist categories / themes |
| `Songs.json` / `Song.json` | Theme song rows (`theme_id`, `title`, `artist`, …) |
| `MediaLibrary.json` | Uploaded MP3/MP4 catalog |
| `Genres.json` / `Genre.json` | Optional — linked from themes |
| `Eras.json` / `Era.json` | Optional — linked from themes |

The legacy migration script:

- Maps theme names to `theme_tag` slugs (lowercase, underscored)
- Sanitizes `title`, `artist`, `youtube_id`, `audio_url`, and `start_time`
- Deduplicates `Songs.json` + `MediaLibrary.json` on `(title, artist, theme_tag)`
- Upserts into `public.themes` and `public.theme_songs`

For the bingo_game_tracks library catalog only, use:

```bash
npm run db:migrate-base44
```
