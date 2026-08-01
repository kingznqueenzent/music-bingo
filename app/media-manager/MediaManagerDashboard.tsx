'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  CopyMinus,
  Eraser,
  Wand2,
} from 'lucide-react'
import { formatDuration } from '@/lib/media/probe-media-duration'
import { filterCatalogSongs } from '@/lib/media/filter-catalog-songs'
import { filterSongsBySearchQuery } from '@/lib/media/filter-songs-by-search'
import {
  getSongYoutubeCandidate,
  isYoutubeUrl,
  normalizeYoutubeUrl,
} from '@/lib/media/normalize-youtube-url'
import { MediaUploadDropzone } from './MediaUploadDropzone'
import { ThemeCoverageGrid } from './ThemeCoverageGrid'
import { BulkThemeToolbar } from './BulkThemeToolbar'
import { InlineEditableField } from './InlineEditableField'
import { MediaManagerFilterTabs, MediaManagerFiltersPanel } from './MediaManagerFilterTabs'
import { useMediaCatalog } from './hooks/useMediaCatalog'
import { useAudioPreview } from './hooks/useAudioPreview'
import type { CatalogSong, SongUpdatePayload } from './types'

const BG = '#121212'
const SURFACE = '#1E1E1E'
const NEON = '#00FFFF'

function mediaTypeBadge(type: string): { label: string; className: string } {
  if (type === 'video') return { label: 'video', className: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
  if (type === 'youtube') return { label: 'youtube', className: 'bg-red-500/15 text-red-300 border-red-500/30' }
  return { label: 'audio', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
}

function buildUpdatePayload(form: Partial<CatalogSong>): SongUpdatePayload {
  const mediaUrl = form.media_url?.trim() || null
  const youtubeUrl = form.youtube_url?.trim() || null
  let mediaType = form.media_type ?? 'audio'
  if (youtubeUrl) mediaType = 'youtube'
  else if (mediaUrl?.match(/\.(mp4|webm)$/i)) mediaType = 'video'
  else if (mediaUrl) mediaType = 'audio'

  return {
    title: String(form.title ?? '').trim(),
    artist: form.artist ? String(form.artist).trim() : null,
    year:
      form.year === null || form.year === undefined || form.year === ('' as unknown as null)
        ? null
        : Number(form.year),
    theme_id: form.theme_id ? String(form.theme_id).trim() : null,
    media_url: mediaUrl,
    storage_path: form.storage_path?.trim() || null,
    youtube_url: youtubeUrl,
    start_time_sec: Number(form.start_time_sec ?? 0),
    duration_sec: Number(form.duration_sec ?? 35),
    file_duration_sec:
      form.file_duration_sec === null || form.file_duration_sec === undefined
        ? null
        : Number(form.file_duration_sec),
    media_type: mediaType,
  }
}

/** Client shell for `/media-manager` — search, filters, table selection, bulk toolbar. */
export function MediaManagerPageClient({
  searchQuery,
  searchInput,
}: {
  searchQuery: string
  searchInput: ReactNode
}) {
  return <MediaManagerDashboardInner searchQuery={searchQuery} searchInput={searchInput} />
}

function MediaManagerDashboardInner({
  searchQuery,
  searchInput,
}: {
  searchQuery: string
  searchInput: ReactNode
}) {
  const {
    songs,
    themes,
    loading,
    error,
    setError,
    refetch,
    themeCounts,
    updateSong,
    patchSongFields,
    deleteSong,
    assignTheme,
    bulkDeleteSongs,
    deleteUnassignedSongs,
    bulkAssignTheme,
    removeDuplicates,
  } = useMediaCatalog()

  const { playingSongId, togglePlayback, stop } = useAudioPreview()

  const [selectedThemeFilter, setSelectedThemeFilter] = useState('')
  const [selectedGenreFilter, setSelectedGenreFilter] = useState('')
  const [uploadThemeId, setUploadThemeId] = useState('')
  const [removingDupes, setRemovingDupes] = useState(false)
  const [cleaningUnassigned, setCleaningUnassigned] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkApplyingTheme, setBulkApplyingTheme] = useState(false)
  const [bulkThemeId, setBulkThemeId] = useState('')
  const [libraryView, setLibraryView] = useState<'all' | 'uncategorized'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [taggingId, setTaggingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<CatalogSong>>({})
  const [editSnapshot, setEditSnapshot] = useState<CatalogSong | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [inlineSavingKey, setInlineSavingKey] = useState<string | null>(null)

  const themeNameById = useMemo(() => new Map(themes.map((t) => [t.id, t.name])), [themes])

  const visibleSongs = useMemo(() => {
    const byFilters = filterCatalogSongs(songs, themeNameById, {
      libraryView,
      selectedThemeFilter,
      selectedGenreFilter,
      searchQuery: '',
    })
    return filterSongsBySearchQuery(byFilters, themeNameById, searchQuery)
  }, [songs, selectedThemeFilter, selectedGenreFilter, searchQuery, themeNameById, libraryView])

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedThemeFilter !== '' ||
    selectedGenreFilter !== '' ||
    libraryView === 'uncategorized'

  function showUncategorizedOnly() {
    setLibraryView((v) => (v === 'uncategorized' ? 'all' : 'uncategorized'))
    setSelectedThemeFilter('')
    setSelectedGenreFilter('')
  }

  function handleSelectTheme(themeId: string) {
    if (themeId === '') {
      setLibraryView('all')
      setSelectedThemeFilter('')
      return
    }
    if (themeId === 'uncategorized') {
      setLibraryView((v) => (v === 'uncategorized' ? 'all' : 'uncategorized'))
      setSelectedThemeFilter('')
      setSelectedGenreFilter('')
      return
    }
    setLibraryView('all')
    setSelectedThemeFilter((prev) => (prev === themeId ? '' : themeId))
  }

  function handleSelectGenre(genreLabel: string) {
    setLibraryView('all')
    setSelectedGenreFilter(genreLabel)
    if (genreLabel) setSelectedThemeFilter('')
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllVisible() {
    if (visibleSongs.every((s) => selectedIds.has(s.id))) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleSongs.forEach((s) => next.delete(s.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleSongs.forEach((s) => next.add(s.id))
        return next
      })
    }
  }

  function startEdit(song: CatalogSong) {
    setEditingId(song.id)
    setEditForm({ ...song })
    setEditSnapshot(song)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({})
    setEditSnapshot(null)
  }

  async function handleSaveEdit(id: string) {
    setSavingId(id)
    setError('')
    const ok = await updateSong(id, buildUpdatePayload(editForm))
    setSavingId(null)
    if (ok) cancelEdit()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this track from the library?')) return
    setError('')
    if (playingSongId === id) stop()
    if (editingId === id) cancelEdit()
    await deleteSong(id)
  }

  async function handleRemoveDupes() {
    setRemovingDupes(true)
    setError('')
    const removed = await removeDuplicates()
    setRemovingDupes(false)
    if (removed === 0) window.alert('No duplicate tracks found (matched by title + artist).')
    else if (removed > 0 && playingSongId && !songs.some((s) => s.id === playingSongId)) stop()
  }

  async function handleClearUnassigned() {
    const count = themeCounts.uncategorized
    if (count === 0) {
      window.alert('No uncategorized tracks to remove.')
      return
    }
    if (!confirm(`Delete ${count} uncategorized track(s)? This cannot be undone.`)) return
    setCleaningUnassigned(true)
    setError('')
    const deleted = await deleteUnassignedSongs()
    setCleaningUnassigned(false)
    if (deleted > 0) setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} selected track(s)?`)) return
    setBulkDeleting(true)
    setError('')
    if (playingSongId && ids.includes(playingSongId)) stop()
    const ok = await bulkDeleteSongs(ids)
    setBulkDeleting(false)
    if (ok) setSelectedIds(new Set())
  }

  async function handleBulkApplyTheme() {
    const ids = [...selectedIds]
    if (ids.length === 0 || !bulkThemeId) return
    setBulkApplyingTheme(true)
    setError('')
    const ok = await bulkAssignTheme(ids, bulkThemeId)
    setBulkApplyingTheme(false)
    if (ok) {
      setSelectedIds(new Set())
      setBulkThemeId('')
      await refetch()
    }
  }

  async function handleInlineThemeChange(songId: string, themeId: string) {
    setTaggingId(songId)
    setError('')
    await assignTheme(songId, themeId || null)
    setTaggingId(null)
  }

  async function handleInlineFieldSave(
    songId: string,
    field: 'title' | 'artist',
    value: string
  ): Promise<boolean> {
    const key = `${songId}:${field}`
    setInlineSavingKey(key)
    setError('')
    const ok = await patchSongFields(
      songId,
      field === 'title' ? { title: value } : { artist: value || null }
    )
    setInlineSavingKey(null)
    return ok
  }

  async function handleCleanYoutubeUrl(song: CatalogSong) {
    const candidate = getSongYoutubeCandidate(song)
    if (!candidate) return

    const cleaned = normalizeYoutubeUrl(candidate)
    if (!cleaned) {
      setError('Could not parse YouTube URL.')
      return
    }

    setInlineSavingKey(`${song.id}:youtube`)
    setError('')

    const fields: Partial<Pick<CatalogSong, 'youtube_url' | 'media_url' | 'media_type'>> = {
      youtube_url: cleaned,
      media_type: 'youtube',
    }
    if (song.media_url?.trim() && isYoutubeUrl(song.media_url)) {
      fields.media_url = null
    }

    await patchSongFields(song.id, fields)
    setInlineSavingKey(null)
  }

  return (
    <main className="min-h-[calc(100vh-3rem)] text-white p-6 max-w-[1600px] mx-auto space-y-6" style={{ backgroundColor: BG }}>
      <Link href="/host" className="text-slate-400 hover:text-[#00FFFF] text-sm transition-colors inline-block">
        ← Host dashboard
      </Link>

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Media Manager
            <span className="text-gray-500 font-normal text-lg md:text-xl ml-2">
              — {loading ? '…' : songs.length} file{songs.length === 1 ? '' : 's'}
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Upload, tag, preview, and manage LyricGrid catalog media</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={cleaningUnassigned || loading || themeCounts.uncategorized === 0}
            onClick={() => void handleClearUnassigned()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-red-500/35 text-red-200 hover:bg-red-950/30 transition-all disabled:opacity-50"
          >
            {cleaningUnassigned ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
            Clear uncategorized ({themeCounts.uncategorized})
          </button>
          <button
            type="button"
            disabled={removingDupes || loading}
            onClick={() => void handleRemoveDupes()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-amber-500/40 text-amber-200 hover:bg-amber-950/30 transition-all disabled:opacity-50"
          >
            {removingDupes ? <Loader2 className="w-4 h-4 animate-spin" /> : <CopyMinus className="w-4 h-4" />}
            Remove dupes
          </button>
          {selectedIds.size > 0 ? (
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={() => void handleBulkDelete()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-red-500/50 text-red-300 hover:bg-red-950/40 transition-all disabled:opacity-50"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete selected ({selectedIds.size})
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 text-sm border border-white/10 transition-all"
            style={{ backgroundColor: SURFACE, color: NEON }}
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </header>

      {searchInput}

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-red-300 text-sm" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <aside className="w-full xl:w-80 shrink-0 space-y-4">
          <MediaManagerFiltersPanel>
            <MediaManagerFilterTabs
              libraryView={libraryView}
              allTracksActive={
                libraryView === 'all' && !selectedThemeFilter && !selectedGenreFilter
              }
              totalCount={songs.length}
              uncategorizedCount={themeCounts.uncategorized}
              loading={loading}
              onShowAll={() => {
                setLibraryView('all')
                setSelectedThemeFilter('')
                setSelectedGenreFilter('')
              }}
              onToggleUncategorized={showUncategorizedOnly}
            />
            <ThemeCoverageGrid
              themes={themes}
              themeCounts={themeCounts.counts}
              unassigned={themeCounts.uncategorized}
              selectedThemeFilter={libraryView === 'uncategorized' ? 'uncategorized' : selectedThemeFilter}
              selectedGenreFilter={selectedGenreFilter}
              onSelectTheme={handleSelectTheme}
              onSelectGenre={handleSelectGenre}
              embedded
            />
          </MediaManagerFiltersPanel>
        </aside>

        <div className="flex-1 min-w-0 space-y-5 w-full">
          <MediaUploadDropzone
            themes={themes}
            uploadThemeId={uploadThemeId}
            onUploadThemeIdChange={setUploadThemeId}
            onUploaded={() => void refetch()}
            onError={setError}
          />

          <p className="text-xs text-gray-500 px-1">
            {libraryView === 'uncategorized' ? 'Uncategorized view · ' : ''}
            {selectedThemeFilter && selectedThemeFilter !== 'uncategorized' ? 'Theme filter active · ' : ''}
            {selectedGenreFilter ? 'Genre filter active · ' : ''}
            {visibleSongs.length} track{visibleSongs.length === 1 ? '' : 's'} visible
          </p>

          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ backgroundColor: SURFACE }}>
            <div className="p-3 border-b border-white/10 text-[10px] font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-3 items-center">
              <div className="col-span-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibleSongs.length > 0 && visibleSongs.every((s) => selectedIds.has(s.id))}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all visible tracks"
                  className="rounded border-white/20"
                />
                <span className="hidden sm:inline normal-case tracking-normal text-gray-400">Select all</span>
              </div>
              <div className="col-span-3">Title / Artist</div>
              <div className="col-span-1">Duration</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-3">Theme / Genre</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading library…
              </div>
            ) : visibleSongs.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                {hasActiveFilters ? 'No tracks match your search or filter.' : 'No tracks yet — upload MP3 or MP4 files above.'}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {visibleSongs.map((s) => {
                  const isEditing = editingId === s.id
                  const themeName = themes.find((t) => t.id === s.theme_id)?.name
                  const isSaving = savingId === s.id
                  const isPlaying = playingSongId === s.id
                  const hasPreview = Boolean(s.media_url?.trim())
                  const badge = mediaTypeBadge(s.media_type)
                  const isSelected = selectedIds.has(s.id)
                  const isTagging = taggingId === s.id
                  const fullDur = s.file_duration_sec ?? s.duration_sec

                  return (
                    <div
                      key={s.id}
                      className={`p-3 grid grid-cols-12 gap-3 items-start transition-all ${
                        isPlaying ? 'bg-[#00FFFF]/5 ring-1 ring-inset ring-[#00FFFF]/30' : 'hover:bg-white/[0.02]'
                      } ${isEditing ? 'bg-[#00FFFF]/5' : ''} ${isSelected ? 'bg-white/[0.03]' : ''}`}
                    >
                      <div className="col-span-1 pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(s.id)}
                          aria-label={`Select ${s.title}`}
                          className="rounded border-white/20"
                        />
                      </div>
                      <div className="col-span-3 min-w-0 space-y-1">
                        {isEditing ? (
                          <>
                            <input
                              type="url"
                              value={editForm.media_url || ''}
                              onChange={(e) => setEditForm({ ...editForm, media_url: e.target.value })}
                              placeholder="Storage / media URL"
                              className="w-full border border-white/20 rounded px-2 py-1 text-[10px] text-gray-400 font-mono"
                              style={{ backgroundColor: BG }}
                            />
                            <input
                              type="url"
                              value={editForm.youtube_url || ''}
                              onChange={(e) => setEditForm({ ...editForm, youtube_url: e.target.value })}
                              placeholder="YouTube URL"
                              className="w-full border border-white/20 rounded px-2 py-1 text-[10px] text-gray-400 font-mono"
                              style={{ backgroundColor: BG }}
                            />
                          </>
                        ) : (
                          <>
                            <InlineEditableField
                              value={s.title}
                              placeholder="Add title…"
                              required
                              saving={inlineSavingKey === `${s.id}:title`}
                              className="font-medium text-sm text-white"
                              onSave={(next) => handleInlineFieldSave(s.id, 'title', next)}
                            />
                            <InlineEditableField
                              value={s.artist ?? ''}
                              placeholder="Add artist…"
                              saving={inlineSavingKey === `${s.id}:artist`}
                              className="text-xs text-gray-500"
                              inputClassName="text-gray-300"
                              onSave={(next) => handleInlineFieldSave(s.id, 'artist', next)}
                            />
                            {getSongYoutubeCandidate(s) ? (
                              <button
                                type="button"
                                disabled={inlineSavingKey === `${s.id}:youtube`}
                                onClick={() => void handleCleanYoutubeUrl(s)}
                                className="inline-flex items-center gap-1 text-[10px] text-amber-300/90 hover:text-amber-200 disabled:opacity-50"
                                title="Strip tracking params and normalize YouTube URL"
                              >
                                {inlineSavingKey === `${s.id}:youtube` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Wand2 className="w-3 h-3" />
                                )}
                                Clean YouTube URL
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>

                      <div className="col-span-1 text-sm text-gray-400 tabular-nums" title="Full file duration">
                        {formatDuration(fullDur)}
                      </div>

                      <div className="col-span-1">
                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="col-span-3 min-w-0">
                        {isEditing ? (
                          <select
                            value={editForm.theme_id || ''}
                            onChange={(e) => setEditForm({ ...editForm, theme_id: e.target.value || null })}
                            className="w-full border border-white/20 rounded px-2 py-1 text-xs text-gray-300"
                            style={{ backgroundColor: BG }}
                          >
                            <option value="">Unassigned</option>
                            {themes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={s.theme_id || ''}
                            disabled={isTagging}
                            onChange={(e) => void handleInlineThemeChange(s.id, e.target.value)}
                            className="w-full max-w-full border border-white/10 rounded px-2 py-1 text-[11px] text-gray-300 truncate focus:border-[#00FFFF]/50 outline-none disabled:opacity-50"
                            style={{ backgroundColor: BG }}
                            title={themeName ?? 'Assign theme'}
                          >
                            <option value="">Unassigned</option>
                            {themes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="col-span-3 flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => void handleSaveEdit(s.id)}
                              className="p-1.5 rounded hover:bg-[#00FFFF]/20 disabled:opacity-50"
                              style={{ color: NEON }}
                              aria-label="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => {
                                if (editSnapshot) setEditForm(editSnapshot)
                                cancelEdit()
                              }}
                              className="p-1.5 rounded hover:bg-white/10 text-gray-400"
                              aria-label="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(s)}
                              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-[#00FFFF]"
                              aria-label="Edit media URLs"
                              title="Edit media URLs"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={!hasPreview}
                              onClick={() => void togglePlayback(s, setError)}
                              className={`p-1.5 rounded-full border transition-all disabled:opacity-30 ${
                                isPlaying
                                  ? 'border-[#00FFFF] bg-[#00FFFF]/15 text-[#00FFFF]'
                                  : 'border-white/10 text-gray-400 hover:border-[#00FFFF]/50 hover:text-[#00FFFF]'
                              }`}
                              aria-label={isPlaying ? 'Pause' : 'Play preview'}
                              title={hasPreview ? 'Play preview' : 'No storage URL'}
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(s.id)}
                              className="p-1.5 rounded hover:bg-red-500/20 text-red-400/40 hover:text-red-400"
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedIds.size > 0 ? (
        <BulkThemeToolbar
          selectedCount={selectedIds.size}
          themes={themes}
          bulkThemeId={bulkThemeId}
          onBulkThemeIdChange={setBulkThemeId}
          applying={bulkApplyingTheme}
          onApply={() => void handleBulkApplyTheme()}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      ) : null}
    </main>
  )
}

/** @deprecated Use MediaManagerPageClient with searchQuery from page.tsx */
export function MediaManagerDashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  return (
    <MediaManagerDashboardInner
      searchQuery={searchQuery}
      searchInput={
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search songs, artists, or URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      }
    />
  )
}
