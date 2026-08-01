'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { ThemeOption } from './types'

type LibraryImporterProps = {
  themes: ThemeOption[]
  busy: boolean
  onImport: (lines: string[], themeId: string | null) => Promise<{ inserted: number; skipped: number } | null>
}

/** Replaces Base44 LibraryImporter — bulk text import into bingo_game_tracks. */
export function LibraryImporter({ themes, busy, onImport }: LibraryImporterProps) {
  const [text, setText] = useState('')
  const [themeId, setThemeId] = useState('')
  const [result, setResult] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    const lines = text.split(/\r?\n/)
    if (lines.every((l) => !l.trim() || l.trim().startsWith('#'))) {
      setResult('Add at least one track line (Artist - Title or Title|Genre).')
      return
    }
    const outcome = await onImport(lines, themeId || null)
    if (outcome) {
      setResult(`Imported ${outcome.inserted} track(s), skipped ${outcome.skipped} duplicate(s).`)
      if (outcome.inserted > 0) setText('')
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <p className="text-slate-400 text-sm">
        One track per line: <code className="text-slate-300">Artist - Title</code> or{' '}
        <code className="text-slate-300">Title|Genre</code>. Lines starting with # are ignored.
      </p>
      {themes.length > 0 && (
        <div>
          <label className="block text-slate-400 text-sm mb-1">Default theme (optional)</label>
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            disabled={busy}
            className="rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full max-w-md"
          >
            <option value="">Infer genre from line or theme</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
        rows={8}
        placeholder={'# Example\nShabba Ranks - Mr. Lover Man\nBeres Hammond - Rock Away|Reggae'}
        className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-medium px-4 py-2 text-sm"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Import tracks
      </button>
      {result ? <p className="text-sm text-emerald-300/90">{result}</p> : null}
    </form>
  )
}
