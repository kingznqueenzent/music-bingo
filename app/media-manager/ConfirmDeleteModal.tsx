'use client'

import { Loader2, Trash2, X } from 'lucide-react'

export type ConfirmDeleteModalProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmation dialog before destructive track deletes. */
export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = 'Delete track',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#1E1E1E] shadow-[0_0_48px_rgba(239,68,68,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-white/5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400/80 mb-1">
              Confirm deletion
            </p>
            <h2 id="confirm-delete-title" className="text-lg font-bold text-white">
              {title}
            </h2>
            <p className="text-sm text-white/50 mt-1">{description}</p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="shrink-0 h-9 w-9 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm py-3 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? 'Deleting…' : confirmLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-semibold text-sm py-3 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
