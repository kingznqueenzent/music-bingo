'use client'

import { memo } from 'react'
import {
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Play,
  Pause,
  Wand2,
} from 'lucide-react'
import { formatDuration } from '@/lib/media/probe-media-duration'
import { getSongYoutubeCandidate } from '@/lib/media/normalize-youtube-url'
import { InlineEditableField } from './InlineEditableField'
import type { CatalogSong, CatalogTheme } from './types'

const BG = '#121212'
const NEON = '#00FFFF'

function mediaTypeBadge(type: string): { label: string; className: string } {
  if (type === 'video') return { label: 'video', className: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
  if (type === 'youtube') return { label: 'youtube', className: 'bg-red-500/15 text-red-300 border-red-500/30' }
  return { label: 'audio', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
}

export type MediaSongRowProps = {
  song: CatalogSong
  themes: CatalogTheme[]
  themeName: string | undefined
  isSelected: boolean
  isEditing: boolean
  isPlaying: boolean
  isSaving: boolean
  isTagging: boolean
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
}

function MediaSongRowInner({
  song: s,
  themes,
  themeName,
  isSelected,
  isEditing,
  isPlaying,
  isSaving,
  isTagging,
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
}: MediaSongRowProps) {
  const hasPreview = Boolean(s.media_url?.trim())
  const badge = mediaTypeBadge(s.media_type)
  const fullDur = s.file_duration_sec ?? s.duration_sec
  const showCleanYoutube = Boolean(getSongYoutubeCandidate(s))

  return (
    <div
      className={`p-3 grid grid-cols-12 gap-3 items-start transition-all ${
        isPlaying ? 'bg-[#00FFFF]/5 ring-1 ring-inset ring-[#00FFFF]/30' : 'hover:bg-white/[0.02]'
      } ${isEditing ? 'bg-[#00FFFF]/5' : ''} ${isSelected ? 'bg-white/[0.03]' : ''}`}
    >
      <div className="col-span-1 pt-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(s.id)}
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
              onChange={(e) => onEditFormChange({ ...editForm, media_url: e.target.value })}
              placeholder="Storage / media URL"
              className="w-full border border-white/20 rounded px-2 py-1 text-[10px] text-gray-400 font-mono"
              style={{ backgroundColor: BG }}
            />
            <input
              type="url"
              value={editForm.youtube_url || ''}
              onChange={(e) => onEditFormChange({ ...editForm, youtube_url: e.target.value })}
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
              onSave={(next) => onInlineFieldSave(s.id, 'title', next)}
            />
            <InlineEditableField
              value={s.artist ?? ''}
              placeholder="Add artist…"
              saving={inlineSavingKey === `${s.id}:artist`}
              className="text-xs text-gray-500"
              inputClassName="text-gray-300"
              onSave={(next) => onInlineFieldSave(s.id, 'artist', next)}
            />
            {showCleanYoutube ? (
              <button
                type="button"
                disabled={inlineSavingKey === `${s.id}:youtube`}
                onClick={() => onCleanYoutubeUrl(s)}
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
            onChange={(e) => onEditFormChange({ ...editForm, theme_id: e.target.value || null })}
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
            onChange={(e) => onInlineThemeChange(s.id, e.target.value)}
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
              onClick={() => onSaveEdit(s.id)}
              className="p-1.5 rounded hover:bg-[#00FFFF]/20 disabled:opacity-50"
              style={{ color: NEON }}
              aria-label="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onCancelEdit}
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
              onClick={() => onStartEdit(s)}
              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-[#00FFFF]"
              aria-label="Edit media URLs"
              title="Edit media URLs"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!hasPreview}
              onClick={() => onTogglePlayback(s)}
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
              onClick={() => onDelete(s.id)}
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
}

function rowPropsEqual(prev: MediaSongRowProps, next: MediaSongRowProps): boolean {
  return (
    prev.song === next.song &&
    prev.themes === next.themes &&
    prev.themeName === next.themeName &&
    prev.isSelected === next.isSelected &&
    prev.isEditing === next.isEditing &&
    prev.isPlaying === next.isPlaying &&
    prev.isSaving === next.isSaving &&
    prev.isTagging === next.isTagging &&
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
    prev.onDelete === next.onDelete
  )
}

export const MediaSongRow = memo(MediaSongRowInner, rowPropsEqual)
