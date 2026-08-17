'use client'

import { memo, useRef } from 'react'
import {
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Play,
  Pause,
  Wand2,
  Music,
  Video,
  Youtube,
  RefreshCw,
} from 'lucide-react'
import { formatDuration } from '@/lib/media/probe-media-duration'
import { getSongYoutubeCandidate } from '@/lib/media/normalize-youtube-url'
import { BATCH_FILE_ACCEPT } from './MediaUploadDropzone'
import { InlineEditableField } from './InlineEditableField'
import { ThemeSelect } from './ThemeSelect'
import type { CatalogSong, CatalogTheme } from './types'

const BG = '#121212'
const NEON = '#00FF66'
const SURFACE = '#1E1E1E'

function MediaTypeIcon({ type }: { type: string }) {
  if (type === 'video') return <Video className="w-4 h-4" />
  if (type === 'youtube') return <Youtube className="w-4 h-4" />
  return <Music className="w-4 h-4" />
}

export type MediaSongRowProps = {
  song: CatalogSong
  themes: CatalogTheme[]
  themeName: string | undefined
  themeCounts?: Record<string, number>
  isSelected: boolean
  isEditing: boolean
  isPlaying: boolean
  isSaving: boolean
  savingMessage?: string | null
  isTagging: boolean
  isReplacingFile?: boolean
  inlineSavingKey: string | null
  editForm: Partial<CatalogSong>
  onToggleSelect: (id: string) => void
  onEditFormChange: (next: Partial<CatalogSong>) => void
  onInlineFieldSave: (songId: string, field: 'title' | 'artist', value: string) => Promise<boolean>
  onCleanYoutubeUrl: (song: CatalogSong) => void
  onInlineThemeChange: (songId: string, themeId: string) => void
  onStartEdit: (song: CatalogSong) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onTogglePlayback: (song: CatalogSong) => void
  onDelete: (id: string) => void
  onReplaceFile?: (songId: string, file: File) => void
}

function MediaSongRowInner({
  song: s,
  themes,
  themeName,
  themeCounts,
  isSelected,
  isEditing,
  isPlaying,
  isSaving,
  savingMessage = null,
  isTagging,
  isReplacingFile = false,
  inlineSavingKey,
  editForm,
  onToggleSelect,
  onEditFormChange,
  onInlineFieldSave,
  onCleanYoutubeUrl,
  onInlineThemeChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onTogglePlayback,
  onDelete,
  onReplaceFile,
}: MediaSongRowProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const hasPreview = Boolean(s.media_url?.trim())
  const fullDur = s.file_duration_sec ?? s.duration_sec
  const showCleanYoutube = Boolean(getSongYoutubeCandidate(s))

  const cardRing = isPlaying
    ? 'border-[#00FF66]/40 ring-1 ring-[#00FF66]/20'
    : isEditing
      ? 'border-[#00FF66]/30'
      : isSelected
        ? 'border-white/15'
        : 'border-white/5 hover:border-white/10'

  return (
    <div
      className={`rounded-xl border p-4 transition-colors min-w-0 ${cardRing}`}
      style={{ backgroundColor: SURFACE }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(s.id)}
          aria-label={`Select ${s.title}`}
          className="rounded border-white/20 mt-2 min-h-5 min-w-5 shrink-0"
        />

        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-[#00FF66] shrink-0 mt-0.5">
          <MediaTypeIcon type={s.media_type} />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {(isSaving || isTagging) && savingMessage ? (
            <p className="text-[10px] text-[#00FF66]/80 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              {savingMessage}
            </p>
          ) : null}
          {isEditing ? (
            <>
              <p className="text-sm font-medium text-white break-words">{editForm.title || s.title}</p>
              <p className="text-xs text-white/40 break-words">{editForm.artist || s.artist || '—'}</p>
              <input
                type="url"
                value={editForm.media_url || ''}
                onChange={(e) => onEditFormChange({ ...editForm, media_url: e.target.value })}
                placeholder="Storage / media URL"
                className="w-full border border-white/10 rounded-lg px-2 py-2 text-xs text-white/60 font-mono mt-2"
                style={{ backgroundColor: BG }}
              />
              <input
                type="url"
                value={editForm.youtube_url || ''}
                onChange={(e) => onEditFormChange({ ...editForm, youtube_url: e.target.value })}
                placeholder="YouTube URL"
                className="w-full border border-white/10 rounded-lg px-2 py-2 text-xs text-white/60 font-mono"
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
                className="text-sm font-medium text-white break-words"
                onSave={(next) => onInlineFieldSave(s.id, 'title', next)}
              />
              <InlineEditableField
                value={s.artist ?? ''}
                placeholder="Add artist…"
                saving={inlineSavingKey === `${s.id}:artist`}
                className="text-xs text-white/40 break-words"
                inputClassName="text-white/70"
                onSave={(next) => onInlineFieldSave(s.id, 'artist', next)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] text-white/30 tabular-nums">{formatDuration(fullDur)}</p>
                {s.genre ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#00FF66]/80 border border-[#00FF66]/25 rounded px-1.5 py-0.5">
                    {s.genre}
                  </span>
                ) : null}
              </div>
            </>
          )}

          {showCleanYoutube && !isEditing ? (
            <button
              type="button"
              disabled={inlineSavingKey === `${s.id}:youtube`}
              onClick={() => onCleanYoutubeUrl(s)}
              className="inline-flex items-center gap-1 text-[10px] text-amber-300/90 hover:text-amber-200 disabled:opacity-50 min-h-8"
            >
              {inlineSavingKey === `${s.id}:youtube` ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              Clean YouTube URL
            </button>
          ) : null}

          {!isEditing && onReplaceFile ? (
            <>
              <input
                ref={replaceInputRef}
                type="file"
                accept={BATCH_FILE_ACCEPT}
                className="hidden"
                disabled={isReplacingFile}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onReplaceFile(s.id, file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                disabled={isReplacingFile}
                onClick={() => replaceInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[10px] text-white/45 hover:text-[#00FF66] disabled:opacity-50 min-h-8"
                title="Upload a new MP3/MP4 for this track"
              >
                {isReplacingFile ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {hasPreview ? 'Replace file' : 'Add file'}
              </button>
            </>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {isEditing ? (
            <ThemeSelect
              value={editForm.theme_id || ''}
              onChange={(themeId) =>
                onEditFormChange({ ...editForm, theme_id: themeId || null })
              }
              themes={themes}
              themeCounts={themeCounts}
              emptyLabel="Unassigned"
              aria-label={`Theme for ${s.title}`}
              className="min-w-[140px]"
            />
          ) : (
            <ThemeSelect
              value={s.theme_id || ''}
              disabled={isTagging}
              onChange={(themeId) => onInlineThemeChange(s.id, themeId)}
              themes={themes}
              themeCounts={themeCounts}
              emptyLabel="Unassigned"
              aria-label={themeName ? `Theme: ${themeName}` : `Assign theme for ${s.title}`}
              className="min-w-[120px] max-w-[160px]"
            />
          )}

          <div className="flex items-center gap-0.5">
            {isEditing ? (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => onSaveEdit(s.id)}
                  className="p-2 min-h-10 min-w-10 rounded-lg hover:bg-[#00FF66]/20 disabled:opacity-50 touch-manipulation"
                  style={{ color: NEON }}
                  aria-label="Save"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={onCancelEdit}
                  className="p-2 min-h-10 min-w-10 rounded-lg hover:bg-white/10 text-white/40 touch-manipulation"
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onStartEdit(s)}
                  className="p-2 min-h-10 min-w-10 rounded-lg hover:bg-white/10 text-white/40 hover:text-[#00FF66] touch-manipulation"
                  aria-label="Edit media URLs"
                  title="Edit media URLs"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!hasPreview}
                  onClick={() => onTogglePlayback(s)}
                  className={`p-2 min-h-10 min-w-10 rounded-lg border transition-all disabled:opacity-30 touch-manipulation ${
                    isPlaying
                      ? 'border-[#00FF66] bg-[#00FF66]/15 text-[#00FF66]'
                      : 'border-white/10 text-white/40 hover:border-[#00FF66]/50 hover:text-[#00FF66]'
                  }`}
                  aria-label={isPlaying ? 'Pause' : 'Play preview'}
                  title={hasPreview ? 'Play preview' : 'No storage URL'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  className="p-2 min-h-10 min-w-10 rounded-lg hover:bg-red-500/20 text-red-400/40 hover:text-red-400 touch-manipulation"
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function rowPropsEqual(prev: MediaSongRowProps, next: MediaSongRowProps): boolean {
  return (
    prev.song === next.song &&
    prev.themes === next.themes &&
    prev.themeName === next.themeName &&
    prev.themeCounts === next.themeCounts &&
    prev.isSelected === next.isSelected &&
    prev.isEditing === next.isEditing &&
    prev.isPlaying === next.isPlaying &&
    prev.isSaving === next.isSaving &&
    prev.savingMessage === next.savingMessage &&
    prev.isTagging === next.isTagging &&
    prev.isReplacingFile === next.isReplacingFile &&
    prev.inlineSavingKey === next.inlineSavingKey &&
    (prev.isEditing ? prev.editForm === next.editForm : true) &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onEditFormChange === next.onEditFormChange &&
    prev.onInlineFieldSave === next.onInlineFieldSave &&
    prev.onCleanYoutubeUrl === next.onCleanYoutubeUrl &&
    prev.onInlineThemeChange === next.onInlineThemeChange &&
    prev.onStartEdit === next.onStartEdit &&
    prev.onSaveEdit === next.onSaveEdit &&
    prev.onCancelEdit === next.onCancelEdit &&
    prev.onTogglePlayback === next.onTogglePlayback &&
    prev.onDelete === next.onDelete &&
    prev.onReplaceFile === next.onReplaceFile
  )
}

export const MediaSongRow = memo(MediaSongRowInner, rowPropsEqual)
