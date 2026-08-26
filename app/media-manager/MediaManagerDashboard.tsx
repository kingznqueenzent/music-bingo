'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Trash2,
  RefreshCw,
  AlertCircle,
  Loader2,
  CopyMinus,
  Eraser,
  Music,
} from 'lucide-react'
import { filterCatalogSongs } from '@/lib/media/filter-catalog-songs'
import { resolveSongStoragePath } from '@/lib/media/resolve-song-storage-path'
import { storagePathWouldChange } from '@/lib/media/song-storage-path'
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
import { ConfirmDeleteModal } from './ConfirmDeleteModal'
import { MediaManagerToast, useMediaManagerToast } from './MediaManagerToast'
import { useMediaCatalog } from './hooks/useMediaCatalog'
import { useHostTier } from './hooks/useHostTier'
import { MediaManagerUpgradeWall } from './MediaManagerUpgradeWall'
import { useAudioPreview } from './hooks/useAudioPreview'
import { LibrarySearchEmpty } from '@/components/media/LibrarySearchEmpty'
import { TrackQuotaUpgradeModal } from '@/components/media/TrackQuotaUpgradeModal'
import { countUntaggedSongs, toStoredGenre, type LibraryGenreFilterId } from '@/lib/media/detect-genre'
import { parseSongYear } from '@/types/song'
import type { CatalogSong, SongUpdatePayload } from './types'

const BG = 'var(--lg-canvas)'
const SURFACE = 'var(--lg-surface)'
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
    year: parseSongYear(form.year),
    theme_id: form.theme_id ? String(form.theme_id).trim() : null,
    genre: toStoredGenre(form.genre != null ? String(form.genre) : null),
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

function songStorageWouldMove(
  song: CatalogSong,
  updates: { artist?: string | null; theme_id?: string | null },
  themeNameById: Map<string, string>
): boolean {
  const currentPath = resolveSongStoragePath(song)
  if (!currentPath) return false

  const themeId = updates.theme_id !== undefined ? updates.theme_id : song.theme_id
  const themeName = themeId ? themeNameById.get(themeId) ?? 'Uncategorized' : 'Uncategorized'
  const artist = updates.artist !== undefined ? updates.artist : song.artist

  return storagePathWouldChange(currentPath, { themeName, artist })
}

function showStorageSaveToasts(
  showToast: (type: 'success' | 'error', message: string) => void,
  result: { ok: boolean; storageMoved?: boolean; storageWarnings?: string[] },
  successMessage: string,
  errorMessage: string
): boolean {
  if (!result.ok) {
    showToast('error', errorMessage)
    return false
  }
  showToast('success', result.storageMoved ? `${successMessage} (file moved)` : successMessage)
  result.storageWarnings?.forEach((w) => showToast('error', w))
  return true
}

/** Client shell for `/media-manager` — search, filters, table selection, bulk toolbar. */
export function MediaManagerPageClient() {
  const hostTier = useHostTier(0)

  if (hostTier.loading) {
    return (
      <main className="min-h-dvh lg-surface-canvas flex items-center justify-center text-slate-400 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading Media Manager…
      </main>
    )
  }

  if (!hostTier.hasMediaLibraryAccess) {
    return <MediaManagerUpgradeWall tier={hostTier.tier} />
  }

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
    bulkAssignFields,
    removeDuplicates,
    replaceSongFile,
  } = useMediaCatalog()

  const { toast, showToast, dismissToast } = useMediaManagerToast()

  const hostTier = useHostTier(songs.length)
  const [quotaModalOpen, setQuotaModalOpen] = useState(false)
  const [quotaModalMessage, setQuotaModalMessage] = useState<string | undefined>()

  const atQuotaCap = false

  const handleQuotaBlocked = useCallback(
    (message: string) => {
      setQuotaModalMessage(message)
      setQuotaModalOpen(true)
      setError(message)
    },
    [setError]
  )

  const trackQuotaGate = useMemo(
    () => ({
      tier: hostTier.tier,
      catalogCount: songs.length,
      onQuotaBlocked: handleQuotaBlocked,
    }),
    [hostTier.tier, songs.length, handleQuotaBlocked]
  )

  const { playingSongId, togglePlayback, stop } = useAudioPreview()

  const searchParams = useSearchParams()
  const themeFromUrl = searchParams.get('theme')?.trim() ?? ''

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState<BatchThemeFilter>('all')
  const [libraryGenreFilter, setLibraryGenreFilter] = useState<LibraryGenreFilterId>('all')
  const [selectedThemeFilter, setSelectedThemeFilter] = useState(themeFromUrl)
  const [selectedGenreFilter, setSelectedGenreFilter] = useState('')
  const [uploadThemeId, setUploadThemeId] = useState(themeFromUrl)
  const [removingDupes, setRemovingDupes] = useState(false)
  const [cleaningUnassigned, setCleaningUnassigned] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkApplyingTheme, setBulkApplyingTheme] = useState(false)
  const [bulkApplyingGenre, setBulkApplyingGenre] = useState(false)
  const [bulkThemeId, setBulkThemeId] = useState('')
  const [bulkGenre, setBulkGenre] = useState('')
  const [bulkYear, setBulkYear] = useState('')
  const [libraryView, setLibraryView] = useState<'all' | 'uncategorized'>('all')
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set())
  const [taggingId, setTaggingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<CatalogSong>>({})
  const [editSnapshot, setEditSnapshot] = useState<CatalogSong | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingMessage, setSavingMessage] = useState<string | null>(null)
  const [inlineSavingKey, setInlineSavingKey] = useState<string | null>(null)
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null)
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE)
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'single'; id: string; title: string }
    | { kind: 'bulk'; ids: string[] }
    | { kind: 'unassigned'; count: number }
    | null
  >(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

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
  }, [searchQuery, batchFilter, selectedThemeFilter, selectedGenreFilter, libraryGenreFilter, libraryView])

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
      libraryGenreFilter,
      searchQuery: '',
    })
    const byBatch = filterSongsByBatchTheme(byFilters, themeNameById, batchFilter)
    return filterSongsBySearchQuery(byBatch, themeNameById, searchQuery, searchHaystackById)
  }, [
    songs,
    selectedThemeFilter,
    selectedGenreFilter,
    libraryGenreFilter,
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

  const untaggedCount = useMemo(() => countUntaggedSongs(songs), [songs])

  const hasMore = displayLimit < filteredSongs.length

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedThemeFilter !== '' ||
    selectedGenreFilter !== '' ||
    libraryGenreFilter !== 'all' ||
    batchFilter !== 'all' ||
    libraryView === 'uncategorized'

  const handleBatchFilterChange = useCallback((next: BatchThemeFilter) => {
    setBatchFilter(next)
    if (next !== 'all') {
      setSelectedThemeFilter('')
      setSelectedGenreFilter('')
      setLibraryGenreFilter('all')
      setLibraryView('all')
    }
  }, [])

  const handleLibraryGenreFilterChange = useCallback((next: LibraryGenreFilterId) => {
    setLibraryGenreFilter(next)
    setBatchFilter('all')
    setSelectedGenreFilter('')
    if (next !== 'all') {
      setSelectedThemeFilter('')
      setLibraryView('all')
    }
  }, [])

  const handleThemeDropdownChange = useCallback((themeId: string) => {
    setSelectedThemeFilter(themeId)
    setBatchFilter('all')
    setSelectedGenreFilter('')
    setLibraryGenreFilter('all')
    setLibraryView('all')
  }, [])

  const showUncategorizedOnly = useCallback(() => {
    setLibraryView((v) => (v === 'uncategorized' ? 'all' : 'uncategorized'))
    setSelectedThemeFilter('')
    setSelectedGenreFilter('')
    setLibraryGenreFilter('all')
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
      setLibraryGenreFilter('all')
      return
    }
    setLibraryView('all')
    setBatchFilter('all')
    setLibraryGenreFilter('all')
    setSelectedThemeFilter((prev) => (prev === themeId ? '' : themeId))
  }, [])

  const handleSelectGenre = useCallback((genreLabel: string) => {
    setLibraryView('all')
    setSelectedGenreFilter(genreLabel)
    setLibraryGenreFilter('all')
    setBatchFilter('all')
    if (genreLabel) setSelectedThemeFilter('')
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedSongIds((prev) => {
      const allSelected =
        filteredSongs.length > 0 && filteredSongs.every((s) => prev.has(s.id))
      const next = new Set(prev)
      if (allSelected) {
        filteredSongs.forEach((s) => next.delete(s.id))
      } else {
        filteredSongs.forEach((s) => next.add(s.id))
      }
      return next
    })
  }, [filteredSongs])

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
      const song = songs.find((s) => s.id === id)
      const payload = buildUpdatePayload(editForm)
      const willMove =
        song &&
        songStorageWouldMove(
          song,
          { artist: payload.artist, theme_id: payload.theme_id },
          themeNameById
        )

      setSavingId(id)
      setSavingMessage(willMove ? 'Moving file and updating metadata…' : 'Saving…')
      setError('')
      const result = await updateSong(id, payload)
      setSavingId(null)
      setSavingMessage(null)
      if (showStorageSaveToasts(showToast, result, 'Track updated', 'Could not save track')) {
        cancelEdit()
      }
    },
    [updateSong, editForm, songs, themeNameById, setError, cancelEdit, showToast]
  )

  const executeDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    if (deleteTarget.kind === 'bulk') setBulkDeleting(true)
    if (deleteTarget.kind === 'unassigned') setCleaningUnassigned(true)
    setError('')

    let ok = false
    if (deleteTarget.kind === 'single') {
      if (playingSongId === deleteTarget.id) stop()
      if (editingId === deleteTarget.id) cancelEdit()
      ok = await deleteSong(deleteTarget.id)
      if (ok) showToast('success', `"${deleteTarget.title}" removed from library`)
      else showToast('error', 'Could not delete track')
    } else if (deleteTarget.kind === 'bulk') {
      if (playingSongId && deleteTarget.ids.includes(playingSongId)) stop()
      ok = await bulkDeleteSongs(deleteTarget.ids)
      if (ok) {
        setSelectedSongIds(new Set())
        showToast('success', `Deleted ${deleteTarget.ids.length} track(s)`)
      } else {
        showToast('error', 'Bulk delete failed')
      }
    } else {
      ok = (await deleteUnassignedSongs()) > 0
      if (ok) {
        setSelectedSongIds(new Set())
        showToast('success', `Deleted ${deleteTarget.count} uncategorized track(s)`)
      } else {
        showToast('error', 'Could not clear uncategorized tracks')
      }
    }

    setDeleteLoading(false)
    setBulkDeleting(false)
    setCleaningUnassigned(false)
    if (ok) setDeleteTarget(null)
  }, [
    deleteTarget,
    playingSongId,
    stop,
    editingId,
    cancelEdit,
    deleteSong,
    bulkDeleteSongs,
    deleteUnassignedSongs,
    setError,
    showToast,
  ])

  const handleDelete = useCallback(
    (id: string) => {
      const song = songs.find((s) => s.id === id)
      setDeleteTarget({ kind: 'single', id, title: song?.title ?? 'Track' })
    },
    [songs]
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
    setDeleteTarget({ kind: 'unassigned', count })
  }, [themeCounts.uncategorized])

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedSongIds]
    if (ids.length === 0) return
    setDeleteTarget({ kind: 'bulk', ids })
  }, [selectedSongIds])

  const handleBulkApplyTheme = useCallback(async () => {
    const ids = [...selectedSongIds]
    if (ids.length === 0 || !bulkThemeId) return
    setBulkApplyingTheme(true)
    setSavingMessage('Moving files and updating metadata…')
    setError('')
    const result = await bulkAssignTheme(ids, bulkThemeId)
    setBulkApplyingTheme(false)
    setSavingMessage(null)
    if (result.ok) {
      setSelectedSongIds(new Set())
      setBulkThemeId('')
      const movedNote =
        result.storageMoved && result.storageMoved > 0 ? ` (${result.storageMoved} file(s) moved)` : ''
      showToast('success', `Theme applied to ${ids.length} track(s)${movedNote}`)
      result.storageWarnings?.forEach((w) => showToast('error', w))
      await refetch()
    } else {
      showToast('error', 'Bulk theme update failed')
    }
  }, [selectedSongIds, bulkThemeId, bulkAssignTheme, setError, refetch, showToast])

  const handleBulkApplyGenre = useCallback(async () => {
    const ids = [...selectedSongIds]
    const yearValue = bulkYear.trim() ? parseSongYear(bulkYear) : undefined
    if (ids.length === 0) return
    if (!bulkGenre && yearValue === undefined) return
    if (bulkYear.trim() && yearValue === undefined) {
      showToast('error', 'Year must be between 1900 and 2100')
      return
    }

    const fields: { genre?: string | null; year?: number | null } = {}
    if (bulkGenre) fields.genre = toStoredGenre(bulkGenre)
    if (yearValue !== undefined) fields.year = yearValue

    const noun = ids.length === 1 ? 'track' : 'tracks'
    const parts: string[] = []
    if (fields.genre !== undefined) parts.push(fields.genre ?? 'Untagged')
    if (fields.year !== undefined) parts.push(String(fields.year))
    const label = parts.join(' · ')

    setBulkApplyingGenre(true)
    setError('')
    const ok = await bulkAssignFields(ids, fields)
    setBulkApplyingGenre(false)
    if (ok) {
      setSelectedSongIds(new Set())
      setBulkGenre('')
      setBulkYear('')
      showToast('success', `Updated ${ids.length} ${noun}${label ? ` to ${label}` : ''}`)
    } else {
      showToast('error', 'Bulk update failed')
    }
  }, [selectedSongIds, bulkGenre, bulkYear, bulkAssignFields, setError, showToast])

  const handleInlineThemeChange = useCallback(
    async (songId: string, themeId: string) => {
      const song = songs.find((s) => s.id === songId)
      const willMove =
        song && songStorageWouldMove(song, { theme_id: themeId || null }, themeNameById)

      setTaggingId(songId)
      setSavingMessage(willMove ? 'Moving file and updating metadata…' : null)
      setError('')
      const result = await assignTheme(songId, themeId || null)
      setTaggingId(null)
      setSavingMessage(null)
      if (result.ok) {
        const themeName = themeId ? themeNameById.get(themeId) : 'Unassigned'
        showStorageSaveToasts(
          showToast,
          result,
          `Theme set to ${themeName ?? 'Unassigned'}`,
          'Could not update theme'
        )
      } else {
        showToast('error', 'Could not update theme')
      }
    },
    [assignTheme, songs, setError, themeNameById, showToast]
  )

  const handleInlineFieldSave = useCallback(
    async (songId: string, field: 'title' | 'artist', value: string): Promise<boolean> => {
      const song = songs.find((s) => s.id === songId)
      const willMove =
        field === 'artist' &&
        song &&
        songStorageWouldMove(song, { artist: value || null }, themeNameById)

      const key = `${songId}:${field}`
      setInlineSavingKey(key)
      setSavingMessage(willMove ? 'Moving file and updating metadata…' : null)
      setError('')
      const result = await patchSongFields(
        songId,
        field === 'title' ? { title: value } : { artist: value || null }
      )
      setInlineSavingKey(null)
      setSavingMessage(null)
      return showStorageSaveToasts(
        showToast,
        result,
        field === 'title' ? 'Title saved' : 'Artist saved',
        `Could not save ${field}`
      )
    },
    [patchSongFields, songs, themeNameById, setError, showToast]
  )

  const handleReplaceFile = useCallback(
    async (songId: string, file: File) => {
      setReplacingFileId(songId)
      setError('')
      const ok = await replaceSongFile(songId, file)
      setReplacingFileId(null)
      if (ok) showToast('success', 'Audio file replaced')
      else showToast('error', 'Could not replace file')
    },
    [replaceSongFile, setError, showToast]
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

  const handleInlineGenreChange = useCallback(
    async (songId: string, genre: string) => {
      const key = `${songId}:genre`
      setInlineSavingKey(key)
      setError('')
      const result = await patchSongFields(songId, {
        genre: toStoredGenre(genre),
      })
      setInlineSavingKey(null)
      if (!result.ok) {
        showToast('error', 'Could not save genre')
        return
      }
      showToast('success', genre.trim() ? `Genre set to ${genre}` : 'Genre cleared')
    },
    [patchSongFields, setError, showToast]
  )

  const handleInlineGenreChangeClick = useCallback(
    (id: string, genre: string) => {
      void handleInlineGenreChange(id, genre)
    },
    [handleInlineGenreChange]
  )

  const handleInlineYearChange = useCallback(
    async (songId: string, rawYear: string): Promise<boolean> => {
      const key = `${songId}:year`
      const year = rawYear.trim() ? parseSongYear(rawYear) : null
      if (rawYear.trim() && year == null) {
        showToast('error', 'Year must be between 1900 and 2100')
        return false
      }
      setInlineSavingKey(key)
      setError('')
      const result = await patchSongFields(songId, { year })
      setInlineSavingKey(null)
      if (!result.ok) {
        showToast('error', 'Could not save year')
        return false
      }
      showToast('success', year != null ? `Year set to ${year}` : 'Year cleared')
      return true
    },
    [patchSongFields, setError, showToast]
  )

  const handleInlineYearChangeClick = useCallback(
    (id: string, year: string) => {
      void handleInlineYearChange(id, year)
    },
    [handleInlineYearChange]
  )

  const handleSaveEditClick = useCallback(
    (id: string) => {
      void handleSaveEdit(id)
    },
    [handleSaveEdit]
  )

  const handleDeleteClick = useCallback(
    (id: string) => {
      handleDelete(id)
    },
    [handleDelete]
  )

  const handleReplaceFileClick = useCallback(
    (songId: string, file: File) => {
      void handleReplaceFile(songId, file)
    },
    [handleReplaceFile]
  )

  const deleteModalCopy = useMemo(() => {
    if (!deleteTarget) return null
    if (deleteTarget.kind === 'single') {
      return {
        title: `Delete "${deleteTarget.title}"?`,
        description:
          'This removes the catalog entry and deletes the audio file from storage. This cannot be undone.',
        confirmLabel: 'Delete track',
      }
    }
    if (deleteTarget.kind === 'bulk') {
      const n = deleteTarget.ids.length
      const noun = n === 1 ? 'track' : 'tracks'
      return {
        title: `Delete ${n} ${noun} permanently?`,
        description:
          'Selected tracks and their storage files will be permanently removed from your library.',
        confirmLabel: `Delete ${n} ${noun}`,
      }
    }
    return {
      title: `Delete ${deleteTarget.count} uncategorized track(s)?`,
      description:
        'All uncategorized tracks and their storage files will be permanently removed.',
      confirmLabel: `Delete ${deleteTarget.count} tracks`,
    }
  }, [deleteTarget])

  const allVisibleSelected =
    filteredSongs.length > 0 && filteredSongs.every((s) => selectedSongIds.has(s.id))
  const someVisibleSelected = filteredSongs.some((s) => selectedSongIds.has(s.id)) && !allVisibleSelected

  return (
    <main
      className="min-h-dvh lg-surface-canvas overflow-x-hidden pb-28"
    >
      <div className="max-w-[1600px] mx-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/host"
              className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:text-[#00FF66] hover:border-[#00FF66]/30 transition-colors shrink-0"
              aria-label="Back to host dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 min-w-0">
              Media Manager
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#00FF66]/10 text-[#00FF66] tabular-nums shrink-0">
                {loading ? '…' : songs.length}
              </span>
              {!hostTier.loading && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border tabular-nums shrink-0 border-white/10 text-white/45 bg-white/5">
                  {hostTier.badgeLabel}
                </span>
              )}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={removingDupes || loading}
              onClick={() => void handleRemoveDupes()}
              className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {removingDupes ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CopyMinus className="w-3.5 h-3.5" />
              )}
              Remove Dupes
            </button>
            <button
              type="button"
              disabled={cleaningUnassigned || loading || themeCounts.uncategorized === 0}
              onClick={() => void handleClearUnassigned()}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Delete all uncategorized tracks"
            >
              {cleaningUnassigned ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Eraser className="w-3.5 h-3.5" />
              )}
              Clear uncategorized ({themeCounts.uncategorized})
            </button>
            {selectedSongIds.size > 0 ? (
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => void handleBulkDelete()}
                className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:border-red-500/50 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {bulkDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete ({selectedSongIds.size})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void refetch()}
              className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-[#00FF66] hover:border-[#00FF66]/30 transition-colors"
              aria-label="Refresh catalog"
              title="Refresh catalog"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

      <MediaManagerFilterBar
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        batchFilter={batchFilter}
        onBatchFilterChange={handleBatchFilterChange}
        genreFilter={libraryGenreFilter}
        onGenreFilterChange={handleLibraryGenreFilterChange}
        untaggedCount={untaggedCount}
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
          setLibraryGenreFilter('all')
          setLibraryView('all')
        }}
      />

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-red-300 text-sm" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-col xl:flex-row gap-5 xl:gap-6 items-start">
        <aside className="w-full xl:w-72 shrink-0 space-y-4 xl:sticky xl:top-[calc(3rem+env(safe-area-inset-top,0px))]">
          <MediaManagerFiltersPanel>
            <MediaManagerFilterTabs
              libraryView={libraryView}
              allTracksActive={
                libraryView === 'all' &&
                !selectedThemeFilter &&
                !selectedGenreFilter &&
                libraryGenreFilter === 'all'
              }
              totalCount={songs.length}
              uncategorizedCount={themeCounts.uncategorized}
              loading={loading}
              onShowAll={() => {
                setLibraryView('all')
                setSelectedThemeFilter('')
                setSelectedGenreFilter('')
                setLibraryGenreFilter('all')
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

        <div className="flex-1 min-w-0 w-full max-w-2xl xl:max-w-none mx-auto xl:mx-0 space-y-5">
          <MediaUploadDropzone
            themes={themes}
            uploadThemeId={uploadThemeId}
            onUploadThemeIdChange={setUploadThemeId}
            onUploaded={() => void refetch()}
            onError={(message) => {
              setError(message)
              if (message.trim()) showToast('error', message)
            }}
            themeCounts={themeCounts.counts}
            trackQuota={trackQuotaGate}
            quotaLabel={hostTier.label}
            atQuotaCap={atQuotaCap}
          />

          <section className="space-y-3" aria-label="Library catalog">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Library Catalog
              </h2>
              {!loading && filteredSongs.length > 0 ? (
                <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected
                    }}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible tracks"
                    className="rounded border-white/20"
                  />
                  Select All
                </label>
              ) : null}
            </div>

            {(libraryView === 'uncategorized' ||
              selectedThemeFilter ||
              selectedGenreFilter ||
              libraryGenreFilter !== 'all' ||
              batchFilter !== 'all' ||
              searchQuery.trim()) && (
              <p className="text-[11px] text-white/35 px-1">
                {libraryView === 'uncategorized' ? 'Uncategorized · ' : ''}
                {selectedThemeFilter && selectedThemeFilter !== 'uncategorized'
                  ? 'Theme filter · '
                  : ''}
                {selectedGenreFilter || libraryGenreFilter !== 'all' ? 'Genre filter · ' : ''}
                {batchFilter !== 'all' ? `${batchFilter} batch · ` : ''}
                {searchQuery.trim() ? 'Search · ' : ''}
                {displayedSongs.length} of {filteredSongs.length} shown
                {filteredSongs.length !== songs.length ? ` (${songs.length} total)` : ''}
              </p>
            )}

            {loading ? (
              <div className="space-y-2" aria-busy="true" aria-label="Loading library">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-16 rounded-xl border border-white/5 animate-pulse"
                    style={{ backgroundColor: SURFACE }}
                  />
                ))}
              </div>
            ) : filteredSongs.length === 0 ? (
              hasActiveFilters ? (
                <div
                  className="rounded-xl border border-white/5 overflow-hidden"
                  style={{ backgroundColor: SURFACE }}
                >
                  <LibrarySearchEmpty
                    query={searchQuery}
                    onClear={() => {
                      setSearchInput('')
                      setSearchQuery('')
                      setBatchFilter('all')
                      setSelectedThemeFilter('')
                      setSelectedGenreFilter('')
                      setLibraryGenreFilter('all')
                      setLibraryView('all')
                    }}
                  />
                </div>
              ) : (
                <div
                  className="p-12 text-center rounded-xl border border-white/5"
                  style={{ backgroundColor: SURFACE }}
                >
                  <div className="mx-auto w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 mb-3">
                    <Music className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-white/70">No media uploaded yet</p>
                  <p className="text-xs text-white/40 mt-1">
                    Add MP3 or MP4 files above to populate themes.
                  </p>
                </div>
              )
            ) : (
              <>
                <div className="space-y-2">
                  {displayedSongs.map((s, index) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.03 }}
                    >
                      <MediaSongRow
                        song={s}
                        themes={themes}
                        themeName={s.theme_id ? themeNameById.get(s.theme_id) : undefined}
                        themeCounts={themeCounts.counts}
                        isSelected={selectedSongIds.has(s.id)}
                        isEditing={editingId === s.id}
                        isPlaying={playingSongId === s.id}
                        isSaving={savingId === s.id}
                        savingMessage={savingId === s.id || taggingId === s.id ? savingMessage : null}
                        isTagging={taggingId === s.id}
                        isReplacingFile={replacingFileId === s.id}
                        inlineSavingKey={
                          inlineSavingKey?.startsWith(`${s.id}:`) ? inlineSavingKey : null
                        }
                        editForm={editingId === s.id ? editForm : {}}
                        onToggleSelect={toggleSelect}
                        onEditFormChange={handleEditFormChange}
                        onInlineFieldSave={handleInlineFieldSave}
                        onCleanYoutubeUrl={handleCleanYoutubeUrlClick}
                        onInlineThemeChange={handleInlineThemeChangeClick}
                        onInlineGenreChange={handleInlineGenreChangeClick}
                        onInlineYearChange={handleInlineYearChangeClick}
                        onStartEdit={startEdit}
                        onSaveEdit={handleSaveEditClick}
                        onCancelEdit={handleCancelEditClick}
                        onTogglePlayback={handleTogglePlayback}
                        onDelete={handleDeleteClick}
                        onReplaceFile={handleReplaceFileClick}
                      />
                    </motion.div>
                  ))}
                </div>
                {hasMore ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDisplayLimit((n) => n + PAGE_SIZE)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#00FF66]/40 text-[#00FF66] hover:bg-[#00FF66]/10 transition-colors"
                    >
                      Load more ({Math.min(PAGE_SIZE, filteredSongs.length - displayLimit)} of{' '}
                      {filteredSongs.length - displayLimit} remaining)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayLimit(filteredSongs.length)}
                      className="px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/25 transition-colors"
                    >
                      Show all {filteredSongs.length}
                    </button>
                  </div>
                ) : filteredSongs.length > PAGE_SIZE ? (
                  <p className="text-center text-[11px] text-white/35 pt-1">
                    All {filteredSongs.length} matching tracks loaded
                  </p>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
      </div>

      {selectedSongIds.size > 0 ? (
        <BulkThemeToolbar
          selectedCount={selectedSongIds.size}
          themes={themes}
          bulkThemeId={bulkThemeId}
          onBulkThemeIdChange={setBulkThemeId}
          applying={bulkApplyingTheme}
          onApply={() => void handleBulkApplyTheme()}
          onClearSelection={() => {
            setSelectedSongIds(new Set())
            setBulkGenre('')
            setBulkYear('')
          }}
          themeCounts={themeCounts.counts}
          bulkGenre={bulkGenre}
          onBulkGenreChange={setBulkGenre}
          bulkYear={bulkYear}
          onBulkYearChange={setBulkYear}
          applyingGenre={bulkApplyingGenre}
          onApplyGenre={() => void handleBulkApplyGenre()}
          deleting={bulkDeleting}
          onDeleteSelected={() => void handleBulkDelete()}
        />
      ) : null}

      <TrackQuotaUpgradeModal
        open={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        tier={hostTier.tier}
        message={quotaModalMessage}
      />

      {deleteModalCopy ? (
        <ConfirmDeleteModal
          open={Boolean(deleteTarget)}
          title={deleteModalCopy.title}
          description={deleteModalCopy.description}
          confirmLabel={deleteModalCopy.confirmLabel}
          loading={deleteLoading || bulkDeleting || cleaningUnassigned}
          onConfirm={() => void executeDelete()}
          onCancel={() => {
            if (!deleteLoading) setDeleteTarget(null)
          }}
        />
      ) : null}

      <MediaManagerToast toast={toast} onDismiss={dismissToast} />
    </main>
  )
}

/** @deprecated Use MediaManagerPageClient */
export function MediaManagerDashboard() {
  return <MediaManagerDashboardInner />
}
