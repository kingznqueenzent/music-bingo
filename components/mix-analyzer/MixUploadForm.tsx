'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import type { MixUploadResponse } from '@/lib/mix-analyzer-types'
import { mixUploadUrl } from '@/lib/mix-analyzer-api'

const UPLOAD_FAILED_MSG = 'Upload failed. Try again.'

type Props = {
  onUploadProgress?: (percent: number) => void
  onSuccess: (res: MixUploadResponse) => void
  onError: (message: string) => void
  disabled?: boolean
  accept?: string
}

export function MixUploadForm({
  onUploadProgress,
  onSuccess,
  onError,
  disabled,
  accept = '.mp3,audio/mpeg,audio/mp3',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)

  const uploadFile = useCallback(
    async (file: File) => {
      setBusy(true)
      onUploadProgress?.(0)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(mixUploadUrl(), { method: 'POST', body: fd })
        let data: unknown = {}
        try {
          data = await res.json()
        } catch {
          data = {}
        }
        const body = data as MixUploadResponse & { error?: { message?: string } }
        if (!res.ok || !body.mix_id) {
          onError(UPLOAD_FAILED_MSG)
          return
        }
        onUploadProgress?.(100)
        onSuccess(body)
      } catch {
        onError(UPLOAD_FAILED_MSG)
      } finally {
        setBusy(false)
      }
    },
    [onError, onSuccess, onUploadProgress],
  )

  const onPick = (files: FileList | null) => {
    if (disabled || busy) return
    const file = files?.[0]
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.mp3')) {
      onError('Please choose an MP3 file.')
      return
    }
    void uploadFile(file)
  }

  const inactive = disabled || busy

  return (
    <div className="w-full max-w-xl mx-auto">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={inactive}
        onChange={(e) => onPick(e.target.files)}
      />
      <div
        onDragOver={(e) => {
          if (inactive) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (inactive) return
          e.preventDefault()
          setDragOver(false)
          onPick(e.dataTransfer.files)
        }}
        className={`
          rounded-2xl border-2 border-dashed px-8 py-10 text-center transition-all
          ${dragOver && !inactive ? 'border-brand-neon bg-brand-neon/10 scale-[1.01]' : 'border-white/20 bg-white/[0.03]'}
          ${inactive ? 'opacity-50' : ''}
        `}
      >
        <Upload
          className={`mx-auto h-10 w-10 mb-4 ${busy ? 'text-brand-neon animate-pulse' : 'text-white/40'}`}
          aria-hidden
        />
        <p className="text-sm text-slate-400 mb-4">Drop an MP3 here or choose a file</p>
        <button
          type="button"
          disabled={inactive}
          onClick={() => inputRef.current?.click()}
          className={`
            inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors
            ${
              inactive
                ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                : 'bg-brand-neon text-slate-950 hover:bg-brand-neon/90 cursor-pointer'
            }
          `}
        >
          {busy ? 'Uploading…' : 'Upload Mix'}
        </button>
        <p className="text-xs text-slate-500 mt-3">Max size depends on your API server</p>
      </div>
    </div>
  )
}
