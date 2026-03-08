'use client'

import { useState } from 'react'
import type { Theme } from '@/lib/supabase/types'

export function ImportYouTubeForm({
  themes,
  initialThemeId,
}: {
  themes: Theme[]
  initialThemeId?: string
}) {
  const defaultId =
    initialThemeId && themes.some((t) => t.id === initialThemeId)
      ? initialThemeId
      : themes[0]?.id ?? ''
  const [themeId, setThemeId] = useState(defaultId)
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [urlsText, setUrlsText] = useState('')
  const [importPlaylistLoading, setImportPlaylistLoading] = useState(false)
  const [importUrlsLoading, setImportUrlsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleImportPlaylist(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!themeId) {
      setError('Select a theme.')
      return
    }
    if (!playlistUrl.trim()) {
      setError('Paste a YouTube playlist URL or playlist ID.')
      return
    }
    setImportPlaylistLoading(true)
    try {
      const res = await fetch('/api/youtube/import-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId, playlistIdOrUrl: playlistUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Import failed')
        return
      }
      setSuccess(`Imported ${data.count} songs from the playlist.`)
      setPlaylistUrl('')
    } finally {
      setImportPlaylistLoading(false)
    }
  }

  async function handleImportUrls(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!themeId) {
      setError('Select a theme.')
      return
    }
    if (!urlsText.trim()) {
      setError('Paste at least one YouTube URL or video ID per line.')
      return
    }
    setImportUrlsLoading(true)
    try {
      const res = await fetch('/api/youtube/import-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId, urlsText: urlsText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Import failed')
        return
      }
      setSuccess(`Added ${data.count} songs to the theme.`)
      setUrlsText('')
    } finally {
      setImportUrlsLoading(false)
    }
  }

  if (themes.length === 0) {
    return (
      <p className="text-slate-400">
        No themes found. Run <code className="font-mono text-sm">supabase/seed-themes.sql</code> in Supabase first.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {/* Import from playlist URL */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Import from a YouTube playlist</h3>
        <p className="text-slate-400 text-sm mb-4">
          Paste a playlist URL (or the playlist ID). Up to 60 songs are added in one go. Requires YOUTUBE_API_KEY in env.
        </p>
        <form onSubmit={handleImportPlaylist} className="space-y-3">
          <div>
            <label className="block text-slate-300 text-sm mb-1">Theme</label>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-300 text-sm mb-1">Playlist URL or ID</label>
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=PLxxx or PLxxx"
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100 placeholder-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={importPlaylistLoading}
            className="rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-semibold py-2 px-6"
          >
            {importPlaylistLoading ? 'Importing…' : 'Import up to 60 songs'}
          </button>
        </form>
      </div>

      {/* Paste URLs */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Paste YouTube URLs (no API key)</h3>
        <p className="text-slate-400 text-sm mb-4">
          One URL or video ID per line. Supports youtube.com/watch?v=..., youtu.be/..., or plain video IDs.
        </p>
        <form onSubmit={handleImportUrls} className="space-y-3">
          <div>
            <label className="block text-slate-300 text-sm mb-1">Theme</label>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-300 text-sm mb-1">URLs (one per line)</label>
            <textarea
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=VIDEO_ID&#10;https://youtu.be/VIDEO_ID"
              rows={6}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100 placeholder-slate-500 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={importUrlsLoading}
            className="rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 font-semibold py-2 px-6"
          >
            {importUrlsLoading ? 'Adding…' : 'Add these songs to theme'}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200 text-sm">
          {success}
        </div>
      )}
    </div>
  )
}
