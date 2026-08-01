'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw, CopyMinus, FolderSync, Tags } from 'lucide-react'
import { TRACK_GENRE_BUCKETS } from '@/lib/media/track-genres'
import { LibraryImporter } from './LibraryImporter'
import { useBingoTrackLibrary } from './hooks/useBingoTrackLibrary'
import type { BingoTrackLibraryRow } from './types'

type Tab = 'library' | 'upload' | 'import'

type ThemeOption = { id: string; name: string }

/** Host media library — Supabase-native replacement for Base44 MediaManager. */
export function MediaLibrary({ initialThemeId }: { initialThemeId?: string | null }) {
  const {
    tracks,
    mediaItems,
    themes,
    loading,
    uploading,
    uploadingFileName,
    busyAction,
    error,
    setError,
    refetch,
    updateTrack,
    uploadFile,
    removeDuplicates,
    syncFromMediaLibrary,
    backfillGenres,
    importTrackLines,
  } = useBingoTrackLibrary()

  const [tab, setTab] = useState<Tab>('library')
  const [uploadThemeId, setUploadThemeId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingArtist, setEditingArtist] = useState('')
  const [editingGenre, setEditingGenre] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [editingThemeId, setEditingThemeId] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const initialThemeApplied = useRef(false)

  useEffect(() => {
    if (initialThemeApplied.current || !initialThemeId || !themes.length) return
    if (themes.some((t) => t.id === initialThemeId)) {
      setUploadThemeId(initialThemeId)
      initialThemeApplied.current = true
    }
  }, [initialThemeId, themes])

  const tracksByGenre = useMemo(() => {
    const map = new Map<string, BingoTrackLibraryRow[]>()
    for (const track of tracks) {
      const genre = track.genre?.trim() || 'Uncategorized'
      const list = map.get(genre) ?? []
      list.push(track)
      map.set(genre, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [tracks])

  const genreOptions = useMemo(() => {
    const fromTracks = tracks.map((t) => t.genre).filter(Boolean) as string[]
    return [...new Set([...TRACK_GENRE_BUCKETS, ...fromTracks])].sort((a, b) => a.localeCompare(b))
  }, [tracks])

  function startEditTrack(track: BingoTrackLibraryRow) {
    setEditingId(track.id)
    setEditingTitle(track.title)
    setEditingArtist(track.artist ?? '')
    setEditingGenre(track.genre ?? '')
    setEditingUrl(track.file_url ?? '')
    setEditingThemeId(track.theme_id ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
    setEditingArtist('')
    setEditingGenre('')
    setEditingUrl('')
    setEditingThemeId('')
  }

  async function saveTrack() {
    if (!editingId || savingId) return
    const title = editingTitle.trim()
    if (!title) {
      setError('Track title cannot be empty.')
      return
    }
    setSavingId(editingId)
    setError('')
    const ok = await updateTrack(editingId, {
      title,
      artist: editingArtist.trim() || null,
      genre: editingGenre.trim() || null,
      file_url: editingUrl.trim() || null,
      theme_id: editingThemeId || null,
    })
    if (ok) cancelEdit()
    setSavingId(null)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setActionMessage(null)
    await uploadFile(file, uploadThemeId || null)
    e.target.value = ''
  }

  async function handleRemoveDupes() {
    setActionMessage(null)
    const removed = await removeDuplicates()
    if (removed >= 0) setActionMessage(removed === 0 ? 'No duplicates found.' : `Removed ${removed} duplicate(s).`)
  }

  async function handleSync() {
    setActionMessage(null)
    const result = await syncFromMediaLibrary()
    if (result) {
      setActionMessage(`Synced ${result.inserted} track(s); skipped ${result.skipped} existing.`)
    }
  }

  async function handleBackfill() {
    setActionMessage(null)
    const updated = await backfillGenres()
    if (updated !== null) {
      setActionMessage(updated === 0 ? 'All tracks already have genres.' : `Backfilled ${updated} genre(s).`)
    }
  }

  const isBusy = Boolean(busyAction)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-4">
        {(
          [
            ['library', `Song library (${tracks.length})`],
            ['upload', 'Upload file'],
            ['import', 'Import lines'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'library' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Song library</h2>
              <p className="text-slate-500 text-sm">
                Loaded from Supabase <code className="text-emerald-300/90">bingo_game_tracks</code> — grouped by genre
                (Dancehall, Reggae, 80&apos;s Pop, …).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleRemoveDupes()}
                disabled={loading || isBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                {busyAction === 'dedupe' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CopyMinus className="w-3.5 h-3.5" />}
                Remove dupes
              </button>
              <button
                type="button"
                onClick={() => void handleSync()}
                disabled={loading || isBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                {busyAction === 'sync' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderSync className="w-3.5 h-3.5" />}
                Sync uploads
              </button>
              <button
                type="button"
                onClick={() => void handleBackfill()}
                disabled={loading || isBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                {busyAction === 'backfill' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tags className="w-3.5 h-3.5" />}
                Backfill genres
              </button>
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={loading || isBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Refresh
              </button>
            </div>
          </div>

          {actionMessage ? <p className="text-sm text-emerald-300/90 mb-4">{actionMessage}</p> : null}

          {loading ? (
            <p className="text-slate-400">Loading tracks…</p>
          ) : tracks.length === 0 ? (
            <p className="text-slate-500">
              No tracks in the catalog yet. Upload files, import lines, or run{' '}
              <code className="text-slate-400">npm run db:migrate-base44</code>.
            </p>
          ) : (
            <div className="space-y-8">
              {tracksByGenre.map(([genre, genreTracks]) => (
                <section key={genre}>
                  <h3 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                    {genre}
                    <span className="text-slate-500 text-sm font-normal">({genreTracks.length})</span>
                  </h3>
                  <ul className="space-y-2">
                    {genreTracks.map((track) => (
                      <li
                        key={track.id}
                        className="flex flex-col gap-2 py-3 border-b border-slate-700/50 last:border-0"
                      >
                        {editingId === track.id ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                placeholder="Title"
                                className="flex-1 min-w-[160px] rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100"
                              />
                              <input
                                type="text"
                                value={editingArtist}
                                onChange={(e) => setEditingArtist(e.target.value)}
                                placeholder="Artist"
                                className="flex-1 min-w-[140px] rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100"
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={editingGenre}
                                onChange={(e) => setEditingGenre(e.target.value)}
                                placeholder="Genre"
                                list="track-genre-options"
                                className="min-w-[140px] rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm"
                              />
                              <datalist id="track-genre-options">
                                {genreOptions.map((g) => (
                                  <option key={g} value={g} />
                                ))}
                              </datalist>
                              <select
                                value={editingThemeId}
                                onChange={(e) => setEditingThemeId(e.target.value)}
                                className="min-w-[160px] rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm"
                              >
                                <option value="">No theme</option>
                                {themes.map((t: ThemeOption) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="url"
                                value={editingUrl}
                                onChange={(e) => setEditingUrl(e.target.value)}
                                placeholder="File URL (optional)"
                                className="flex-1 min-w-[200px] rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void saveTrack()}
                                disabled={savingId === track.id || !editingTitle.trim()}
                                className="rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-medium py-1.5 px-4 text-sm"
                              >
                                {savingId === track.id ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={savingId === track.id}
                                className="rounded-full border border-slate-500 text-slate-300 hover:bg-slate-700 font-medium py-1.5 px-4 text-sm disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-100 font-medium truncate">{track.title}</p>
                              <p className="text-slate-400 text-sm truncate">
                                {track.artist ?? 'Unknown artist'}
                                {track.file_url ? ' · has audio URL' : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => startEditTrack(track)}
                              className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-1.5 px-3 text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'upload' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Upload file</h2>
          <p className="text-slate-400 text-sm mb-4">
            MP3 or MP4, max 100 MB. Files upload to Supabase Storage (<code className="text-slate-300">media</code>{' '}
            bucket) and register in <code className="text-slate-300">media_library</code>. Use Sync uploads to copy into
            the song library.
          </p>
          {themes.length > 0 && (
            <div className="mb-4">
              <label className="block text-slate-400 text-sm mb-1">Theme (optional)</label>
              <select
                value={uploadThemeId}
                onChange={(e) => setUploadThemeId(e.target.value)}
                disabled={uploading}
                className="rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">No theme</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 px-4 py-2 font-medium cursor-pointer disabled:opacity-50">
            <input
              type="file"
              accept=".mp3,.mp4"
              onChange={(e) => void handleUpload(e)}
              disabled={uploading}
              className="sr-only"
            />
            {uploading && uploadingFileName
              ? `Uploading: ${uploadingFileName}`
              : uploading
                ? 'Uploading…'
                : 'Choose MP3 or MP4'}
          </label>
          {mediaItems.length > 0 && (
            <p className="text-slate-500 text-xs mt-4">{mediaItems.length} file(s) in media_library uploads.</p>
          )}
        </div>
      )}

      {tab === 'import' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Import track lines</h2>
          <LibraryImporter
            themes={themes}
            busy={busyAction === 'import'}
            onImport={importTrackLines}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">{error}</div>
      )}
    </div>
  )
}

/** @deprecated Use MediaLibrary — kept for existing imports */
export const MediaManager = MediaLibrary
