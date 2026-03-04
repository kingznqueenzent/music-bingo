'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MediaLibraryItem } from '@/lib/supabase/types'

export function MediaManager() {
  const supabase = createClient()
  const [items, setItems] = useState<MediaLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: e } = await supabase
      .from('media_library')
      .select('*')
      .order('created_at', { ascending: false })
    if (e) {
      setError(e.message)
      setItems([])
    } else {
      setItems((data ?? []) as MediaLibraryItem[])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.set('file', file)
    formData.set('name', file.name)
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-2">Upload file</h2>
        <p className="text-slate-400 text-sm mb-4">
          MP3 or MP4, max 100 MB. Files are stored in Supabase Storage.
        </p>
        <label className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 px-4 py-2 font-medium cursor-pointer disabled:opacity-50">
          <input
            type="file"
            accept=".mp3,.mp4"
            onChange={handleUpload}
            disabled={uploading}
            className="sr-only"
          />
          {uploading ? 'Uploading…' : 'Choose MP3 or MP4'}
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Indexed media</h2>
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500">
            No files yet. Upload MP3 or MP4 above. Create a bucket named &quot;media&quot; in Supabase → Storage if you see an error.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 py-2 border-b border-slate-700/50 last:border-0"
              >
                <span className="text-slate-200 truncate">{item.name}</span>
                <span className="text-slate-500 text-sm shrink-0">
                  {item.file_type.toUpperCase()} · {item.file_size_bytes ? `${(item.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
