'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  loadLibraryTracks,
  type BingoTrackLibraryRow,
} from '@/lib/media/bingo-track-library'
import type { MediaLibraryItem, Theme, Genre, Era } from '@/lib/supabase/types'
import { sortThemesChronologicalThenGenre } from '@/lib/sort-themes'

type Tab = 'upload' | 'library'
type ThemeOption = { id: string; name: string }

/** Host media library UI — catalog from `bingo_game_tracks` (game_id IS NULL). */
export function MediaLibrary({ initialThemeId }: { initialThemeId?: string | null }) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('library')
  const [tracks, setTracks] = useState<BingoTrackLibraryRow[]>([])
  const [items, setItems] = useState<MediaLibraryItem[]>([])
  const [themes, setThemes] = useState<ThemeOption[]>([])
  const [uploadThemeId, setUploadThemeId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingArtist, setEditingArtist] = useState('')
  const [editingGenre, setEditingGenre] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [editingThemeId, setEditingThemeId] = useState<string>('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const initialThemeApplied = useRef(false)

  async function loadTracks() {
    setLoading(true)
    setError('')
    const { tracks: rows, error: trackError } = await loadLibraryTracks(supabase)
    if (trackError) {
      setError(trackError)
      setTracks([])
    } else {
      setTracks(rows)
    }
    setLoading(false)
  }

  async function loadMediaUploads() {
    const { data, error: e } = await supabase
      .from('media_library')
      .select('*')
      .order('created_at', { ascending: false })
    if (e) {
      const isSchemaCache = /theme_id|schema cache|column.*media_library/i.test(e.message)
      if (isSchemaCache) {
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('media_library')
          .select('id, name, file_path, file_url, storage_bucket, file_type, file_size_bytes, created_at')
          .order('created_at', { ascending: false })
        if (!fallbackErr) setItems((fallbackData ?? []) as MediaLibraryItem[])
      }
    } else {
      setItems((data ?? []) as MediaLibraryItem[])
    }
  }

  useEffect(() => {
    void loadTracks()
    void loadMediaUploads()
  }, [])

  useEffect(() => {
    Promise.all([
      supabase.from('themes').select('id, name, genre_id, era_id'),
      supabase.from('genres').select('id, name, slug, sort_order'),
      supabase.from('eras').select('id, name, start_year, end_year, sort_order'),
    ]).then(([{ data: themeRows }, { data: genreRows }, { data: eraRows }]) => {
      const sorted = sortThemesChronologicalThenGenre(
        (themeRows ?? []) as Theme[],
        (eraRows ?? []) as Era[],
        (genreRows ?? []) as Genre[]
      )
      setThemes(sorted.map((t) => ({ id: t.id, name: t.name })))
    })
  }, [supabase])

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
    return [...new Set(fromTracks)].sort((a, b) => a.localeCompare(b))
  }, [tracks])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'mp3' && ext !== 'mp4') {
      setError('Only MP3 and MP4 files are allowed.')
      return
    }
    const MAX_MB = 100
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_MB} MB.`)
      return
    }
    setUploading(true)
    setUploadingFileName(file.name)
    setError('')
    const name = file.name
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const path = `${ext}/${safeName}`
    try {
      const { error: uploadError } = await supabase.storage.from('media').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      const fileUrl = urlData.publicUrl
      const insertPayload: Record<string, unknown> = {
        name,
        file_path: path,
        file_url: fileUrl,
        storage_bucket: 'media',
        file_type: ext as 'mp3' | 'mp4',
        file_size_bytes: file.size,
      }
      if (uploadThemeId) insertPayload.theme_id = uploadThemeId
      let { error: insertError } = await supabase.from('media_library').insert(insertPayload)
      if (insertError && /theme_id|schema cache|column/i.test(insertError.message)) {
        delete insertPayload.theme_id
        const retry = await supabase.from('media_library').insert(insertPayload)
        insertError = retry.error
      }
      if (insertError) {
        await supabase.storage.from('media').remove([path])
        throw new Error(insertError.message)
      }
      await loadMediaUploads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadingFileName(null)
      e.target.value = ''
    }
  }

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
    const { error: updateError } = await supabase
      .from('bingo_game_tracks')
      .update({
        title,
        artist: editingArtist.trim() || null,
        genre: editingGenre.trim() || null,
        file_url: editingUrl.trim() || null,
        theme_id: editingThemeId || null,
      })
      .eq('id', editingId)

    if (updateError) {
      setError(updateError.message)
    } else {
      cancelEdit()
      await loadTracks()
    }
    setSavingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-4">
        <button
          type="button"
          onClick={() => setTab('library')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'library' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Song library ({tracks.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'upload' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Upload file
        </button>
      </div>

      {tab === 'library' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Song library</h2>
              <p className="text-slate-500 text-sm">
                Loaded from Supabase <code className="text-emerald-300/90">bingo_game_tracks</code> — grouped by genre.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadTracks()}
              disabled={loading}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {loading ? (
            <p className="text-slate-400">Loading tracks…</p>
          ) : tracks.length === 0 ? (
            <p className="text-slate-500">
              No tracks in the catalog yet. Run <code className="text-slate-400">npm run db:seed-tracks</code> or upload
              files.
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
                                onClick={saveTrack}
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
            MP3 or MP4, max 100 MB. Files go to <code className="text-slate-300">media_library</code> storage; sync to
            the song library from host tools when ready.
          </p>
          {themes.length > 0 && (
            <div className="mb-4">
              <label className="block text-slate-400 text-sm mb-1">Theme (optional)</label>
              <select
                value={uploadThemeId}
                onChange={(e) => setUploadThemeId(e.target.value)}
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
              onChange={handleUpload}
              disabled={uploading}
              className="sr-only"
            />
            {uploading && uploadingFileName
              ? `Uploading: ${uploadingFileName}`
              : uploading
                ? 'Uploading…'
                : 'Choose MP3 or MP4'}
          </label>
          {items.length > 0 && (
            <p className="text-slate-500 text-xs mt-4">{items.length} file(s) in media_library uploads.</p>
          )}
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
