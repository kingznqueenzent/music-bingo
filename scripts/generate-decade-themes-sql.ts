#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { allDecadeThemeNames } from '../lib/decade-theme-catalog'

const names = allDecadeThemeNames()
const values = names
  .map((name, i) => {
    const order = i + 1
    const escaped = name.replace(/'/g, "''")
    return `  ('${escaped}', 'decade-genre', 'LyricGrid decade playlist: ${escaped}', ${order})`
  })
  .join(',\n')

const header = `-- Decade-based themes for LyricGrid Media Manager (${names.length} playlists).
-- Genres 70s-2020s: Country, R&B, Hip-Hop, Reggae, Dancehall Reggae, Funk, Pop
-- Afrobeats 80s-2020s; Rock & Dance 50s-2020s

ALTER TABLE public.themes
  ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_themes_name_lower_unique
  ON public.themes (lower(trim(name)));

`

const body = `INSERT INTO public.themes (name, category, description, display_order)
SELECT v.name, v.category, v.description, v.display_order
FROM (VALUES
${values}
) AS v(name, category, description, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.themes t WHERE lower(trim(t.name)) = lower(trim(v.name))
);

UPDATE public.themes t
SET display_order = v.display_order,
    category = COALESCE(v.category, t.category),
    description = v.description
FROM (VALUES
${values}
) AS v(name, category, description, display_order)
WHERE lower(trim(t.name)) = lower(trim(v.name));

NOTIFY pgrst, 'reload schema';
`

const outPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260730180000_decade_themes_seed.sql')
fs.writeFileSync(outPath, header + body, 'utf8')
console.log('Wrote', outPath, `(${names.length} themes)`)
