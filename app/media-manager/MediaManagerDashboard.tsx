'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Trash2,
  RefreshCw,
  AlertCircle,
  Loader2,
  CopyMinus,
  Eraser,
} from 'lucide-react'
import { filterCatalogSongs } from '@/lib/media/filter-catalog-songs'
import { filterSongsByBatchTheme } from '@/lib/media/filter-songs-by-batch-theme'
import {
  buildSongSearchHaystack,
  filterSongsBySearchQuery,
} from '@/lib/media/filter-songs-by-search'
import {
  getSongYoutubeCandidate,
  isYoutubeUrl,
  normalizeYoutubeUrl,
} from '@/lib/media/normalize-youtube-url'
import { MediaUploadDropzone } from './MediaUploadDropzone'
import { ThemeCoverageGrid } from './ThemeCoverageGrid'
import { BulkThemeToolbar } from './BulkThemeToolbar'
import { MediaManagerFilterBar, type BatchThemeFilter } from './MediaManagerFilterBar'
import { MediaManagerFilterTabs, MediaManagerFiltersPanel } from './MediaManagerFilterTabs'
import { MediaSongRow } from './MediaSongRow'
import { useMediaCatalog } from './hooks/useMediaCatalog'
import { useAudioPreview } from './hooks/useAudioPreview'
import { LibrarySearchEmpty } from '@/components/media/LibrarySearchEmpty'
import type { CatalogSong, SongUpdatePayload } from './types'

const BG = '#121212'
const SURFACE = '#1E1E1E'
const NEON = '#00FFFF'
const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300

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
export function MediaManagerPageClient() {
  return <MediaManagerDashboardInner />
}

function MediaManagerDashboardInner() {
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

  const searchParams = useSearchParams()
  const themeFromUrl = searchParams.get('theme')?.trim() ?? ''

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState<BatchThemeFilter>('all')
  const [selectedThemeFilter, setSelectedThemeFilter] = useState(themeFromUrl)
  const [selectedGenreFilter, setSelectedGenreFilter] = useState('')
  const [uploadThemeId, setUploadThemeId] = useState(themeFromUrl)
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
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE)

  useEffect(() => {
    if (!themeFromUrl) return
    if (themes.length === 0) return
    if (!themes.some((t) => t.id === themeFromUrl)) {
      setSelectedThemeFilter('')
      setUploadThemeId('')
      return
    }
    setSelectedThemeFilter(themeFromUrl)
    setUploadThemeId(themeFromUrl)
    setLibraryView('all')
    setSelectedGenreFilter('')
  }, [themeFromUrl, themes])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setDisplayLimit(PAGE_SIZE)
  }, [searchQuery, batchFilter, selectedThemeFilter, selectedGenreFilter, libraryView])

  const themeNameById = useMemo(() => new Map(themes.map((t) => [t.id, t.name])), [themes])

  const searchHaystackById = useMemo(() => {
    const map = new Map<string, string>()
    for (const song of songs) {
      map.set(song.id, buildSongSearchHaystack(song, themeNameById))
    }
    return map
  }, [songs, themeNameById])

  const filteredSongs = useMemo(() => {
    const byFilters = filterCatalogSongs(songs, themeNameById, {
      libraryView,
      selectedThemeFilter,
      selectedGenreFilter,
      searchQuery: '',
    })
    const byBatch = filterSongsByBatchTheme(byFilters, themeNameById, batchFilter)
    return filterSongsBySearchQuery(byBatch, themeNameById, searchQuery, searchHaystackById)
  }, [
    songs,
    selectedThemeFilter,
    selectedGenreFilter,
    batchFilter,
    searchQuery,
    themeNameById,
    libraryView,
    searchHaystackById,
  ])

  const displayedSongs = useMemo(
    () => filteredSongs.slice(0, displayLimit),
    [filteredSongs, displayLimit]
  )

  const hasMore = displayLimit < filteredSongs.length

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedThemeFilter !== '' ||
    selectedGenreFilter !== '' ||
    batchFilter !== 'all' ||
    libraryView === 'uncategorized'

  const handleBatchFilterChange = useCallback((next: BatchThemeFilter) => {
    setBatchFilter(next)
    if (next !== 'all') {
      setSelectedThemeFilter('')
      setSelectedGenreFilter('')
      setLibraryView('all')
    }
  }, [])

  const handleThemeDropdownChange = useCallback((themeId: string) => {
    setSelectedThemeFilter(themeId)
    setBatchFilter('all')
    setSelectedGenreFilter('')
    setLibraryView('all')
  }, [])

  const showUncategorizedOnly = useCallback(() => {
    setLibraryView((v) => (v === 'uncategorized' ? 'all' : 'uncategorized'))
    setSelectedThemeFilter('')
    setSelectedGenreFilter('')
  }, [])

  const handleSelectTheme = useCallback((themeId: string) => {
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
    setBatchFilter('all')
    setSelectedThemeFilter((prev) => (prev === themeId ? '' : themeId))
  }, [])

  const handleSelectGenre = useCallback((genreLabel: string) => {
    setLibraryView('all')
    setSelectedGenreFilter(genreLabel)
    setBatchFilter('all')
    if (genreLabel) setSelectedThemeFilter('')
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAllDisplayed = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected =
        displayedSongs.length > 0 && displayedSongs.every((s) => prev.has(s.id))
      const next = new Set(prev)
      if (allSelected) {
        displayedSongs.forEach((s) => next.delete(s.id))
      } else {
        displayedSongs.forEach((s) => next.add(s.id))
      }
      return next
    })
  }, [displayedSongs])

  const startEdit = useCallback((song: CatalogSong) => {
    setEditingId(song.id)
    setEditForm({ ...song })
    setEditSnapshot(song)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditForm({})
    setEditSnapshot(null)
  }, [])

  const handleEditFormChange = useCallback((next: Partial<CatalogSong>) => {
    setEditForm(next)
  }, [])

  const handleSaveEdit = useCallback(
    async (id: string) => {
      setSavingId(id)
      setError('')
      const ok = await updateSong(id, buildUpdatePayload(editForm))
      setSavingId(null)
      if (ok) cancelEdit()
    },
    [updateSong, editForm, setError, cancelEdit]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Remove this track from the library?')) return
      setError('')
      if (playingSongId === id) stop()
      if (editingId === id) cancelEdit()
      await deleteSong(id)
    },
    [playingSongId, stop, editingId, cancelEdit, deleteSong, setError]
  )

  const handleRemoveDupes = useCallback(async () => {
    setRemovingDupes(true)
    setError('')
    const removed = await removeDuplicates()
    setRemovingDupes(false)
    if (removed === 0) window.alert('No duplicate tracks found (matched by title + artist).')
    else if (removed > 0 && playingSongId && !songs.some((s) => s.id === playingSongId)) stop()
  }, [removeDuplicates, setError, playingSongId, songs, stop])

  const handleClearUnassigned = useCallback(async () => {
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
  }, [themeCounts.uncategorized, deleteUnassignedSongs, setError])

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} selected track(s)?`)) return
    setBulkDeleting(true)
    setError('')
    if (playingSongId && ids.includes(playingSongId)) stop()
    const ok = await bulkDeleteSongs(ids)
    setBulkDeleting(false)
    if (ok) setSelectedIds(new Set())
  }, [selectedIds, playingSongId, stop, bulkDeleteSongs, setError])

  const handleBulkApplyTheme = useCallback(async () => {
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
  }, [selectedIds, bulkThemeId, bulkAssignTheme, setError, refetch])

  const handleInlineThemeChange = useCallback(
    async (songId: string, themeId: string) => {
      setTaggingId(songId)
      setError('')
      await assignTheme(songId, themeId || null)
      setTaggingId(null)
    },
    [assignTheme, setError]
  )

  const handleInlineFieldSave = useCallback(
    async (songId: string, field: 'title' | 'artist', value: string): Promise<boolean> => {
      const key = `${songId}:${field}`
      setInlineSavingKey(key)
      setError('')
      const ok = await patchSongFields(
        songId,
        field === 'title' ? { title: value } : { artist: value || null }
      )
      setInlineSavingKey(null)
      return ok
    },
    [patchSongFields, setError]
  )

  const handleCleanYoutubeUrl = useCallback(
    async (song: CatalogSong) => {
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
    },
    [patchSongFields, setError]
  )

  const handleTogglePlayback = useCallback(
    (song: CatalogSong) => {
      void togglePlayback(song, setError)
    },
    [togglePlayback, setError]
  )

  const handleCancelEditClick = useCallback(() => {
    if (editSnapshot) setEditForm(editSnapshot)
    cancelEdit()
  }, [editSnapshot, cancelEdit])

  const handleCleanYoutubeUrlClick = useCallback(
    (song: CatalogSong) => {
      void handleCleanYoutubeUrl(song)
    },
    [handleCleanYoutubeUrl]
  )

  const handleInlineThemeChangeClick = useCallback(
    (id: string, themeId: string) => {
      void handleInlineThemeChange(id, themeId)
    },
    [handleInlineThemeChange]
  )

  const handleSaveEditClick = useCallback(
    (id: string) => {
      void handleSaveEdit(id)
    },
    [handleSaveEdit]
  )

  const handleDeleteClick = useCallback(
    (id: string) => {
      void handleDelete(id)
    },
    [handleDelete]
  )

  const allDisplayedSelected =
    displayedSongs.length > 0 && displayedSongs.every((s) => selectedIds.has(s.id))

  return (
    <main
      className="min-h-dvh text-white p-3 sm:p-5 md:p-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-6 overflow-x-hidden pb-28"
      style={{ backgroundColor: BG }}
    >
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

      <MediaManagerFilterBar
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        batchFilter={batchFilter}
        onBatchFilterChange={handleBatchFilterChange}
        selectedThemeId={selectedThemeFilter}
        onThemeChange={handleThemeDropdownChange}
        themes={themes}
        themeCounts={themeCounts.counts}
        resultCount={filteredSongs.length}
        totalCount={songs.length}
        loading={loading}
        onClearSearch={() => {
          setSearchInput('')
          setSearchQuery('')
          setBatchFilter('all')
          setSelectedThemeFilter('')
          setSelectedGenreFilter('')
          setLibraryView('all')
        }}
      />

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
            themeCounts={themeCounts.counts}
          />

          <p className="text-xs text-gray-500 px-1">
            {libraryView === 'uncategorized' ? 'Uncategorized view · ' : ''}
            {selectedThemeFilter && selectedThemeFilter !== 'uncategorized' ? 'Theme filter active · ' : ''}
            {selectedGenreFilter ? 'Genre filter active · ' : ''}
            {batchFilter !== 'all' ? `${batchFilter} batch · ` : ''}
            {searchQuery.trim() ? 'Search active · ' : ''}
            Showing {displayedSongs.length} of {filteredSongs.length} match
            {filteredSongs.length === 1 ? '' : 'es'}
            {filteredSongs.length !== songs.length ? ` (${songs.length} total)` : ''}
          </p>

          <div className="rounded-xl border border-white/10 overflow-hidden min-w-0" style={{ backgroundColor: SURFACE }}>
            <div className="p-3 border-b border-white/10 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden md:grid grid-cols-12 gap-3 items-center">
              <div className="col-span-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allDisplayedSelected}
                  onChange={toggleSelectAllDisplayed}
                  aria-label="Select all loaded tracks"
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
            <div className="md:hidden p-3 border-b border-white/10 flex items-center gap-3">
              <input
                type="checkbox"
                checked={allDisplayedSelected}
                onChange={toggleSelectAllDisplayed}
                aria-label="Select all loaded tracks"
                className="rounded border-white/20 min-h-5 min-w-5"
              />
              <span className="text-xs text-gray-400">Select all loaded</span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading library…
              </div>
            ) : filteredSongs.length === 0 ? (
              hasActiveFilters ? (
                <LibrarySearchEmpty
                  query={searchQuery}
                  onClear={() => {
                    setSearchInput('')
                    setSearchQuery('')
                    setBatchFilter('all')
                    setSelectedThemeFilter('')
                    setSelectedGenreFilter('')
                    setLibraryView('all')
                  }}
                />
              ) : (
                <div className="p-10 text-center text-gray-500">
                  No tracks yet — upload MP3 or MP4 files above.
                </div>
              )
            ) : (
              <>
                <div className="divide-y divide-white/5">
                  {displayedSongs.map((s) => (
                    <MediaSongRow
                      key={s.id}
                      song={s}
                      themes={themes}
                      themeName={s.theme_id ? themeNameById.get(s.theme_id) : undefined}
                      themeCounts={themeCounts.counts}
                      isSelected={selectedIds.has(s.id)}
                      isEditing={editingId === s.id}
                      isPlaying={playingSongId === s.id}
                      isSaving={savingId === s.id}
                      isTagging={taggingId === s.id}
                      inlineSavingKey={
                        inlineSavingKey?.startsWith(`${s.id}:`) ? inlineSavingKey : null
                      }
                      editForm={editingId === s.id ? editForm : {}}
                      onToggleSelect={toggleSelect}
                      onEditFormChange={handleEditFormChange}
                      onInlineFieldSave={handleInlineFieldSave}
                      onCleanYoutubeUrl={handleCleanYoutubeUrlClick}
                      onInlineThemeChange={handleInlineThemeChangeClick}
                      onStartEdit={startEdit}
                      onSaveEdit={handleSaveEditClick}
                      onCancelEdit={handleCancelEditClick}
                      onTogglePlayback={handleTogglePlayback}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
                {hasMore ? (
                  <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDisplayLimit((n) => n + PAGE_SIZE)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#00FFFF]/40 text-[#00FFFF] hover:bg-[#00FFFF]/10 transition-colors"
                    >
                      Load more ({Math.min(PAGE_SIZE, filteredSongs.length - displayLimit)} of{' '}
                      {filteredSongs.length - displayLimit} remaining)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayLimit(filteredSongs.length)}
                      className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/25 transition-colors"
                    >
                      Show all {filteredSongs.length}
                    </button>
                  </div>
                ) : filteredSongs.length > PAGE_SIZE ? (
                  <p className="p-3 text-center text-[11px] text-gray-500 border-t border-white/10">
                    All {filteredSongs.length} matching tracks loaded
                  </p>
                ) : null}
              </>
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
          themeCounts={themeCounts.counts}
        />
      ) : null}
    </main>
  )
}

/** @deprecated Use MediaManagerPageClient */
export function MediaManagerDashboard() {
  return <MediaManagerDashboardInner />
}
