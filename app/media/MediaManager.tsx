'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mediaDisplayName } from '@/lib/media-display'
import type { MediaLibraryItem } from '@/lib/supabase/types'

type Tab = 'upload' | 'library'
type ThemeOption = { id: string; name: string }

export function MediaManager({ initialThemeId }: { initialThemeId?: string | null }) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('upload')
  const [items, setItems] = useState<MediaLibraryItem[]>([])
  const [themes, setThemes] = useState<ThemeOption[]>([])
  const [uploadThemeId, setUploadThemeId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [editingThemeId, setEditingThemeId] = useState<string>('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const initialThemeApplied = useRef(false)

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

  useEffect(() => {
    supabase.from('themes').select('id, name').order('name').then(({ data }) => {
      setThemes((data ?? []) as ThemeOption[])
    })
  }, [])

  useEffect(() => {
    if (initialThemeApplied.current || !initialThemeId || !themes.length) return
    if (themes.some((t) => t.id === initialThemeId)) {
      setUploadThemeId(initialThemeId)
      initialThemeApplied.current = true
    }
  }, [initialThemeId, themes])

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
      const { error: insertError } = await supabase.from('media_library').insert({
        name,
        file_path: path,
        file_url: fileUrl,
        storage_bucket: 'media',
        file_type: ext as 'mp3' | 'mp4',
        file_size_bytes: file.size,
        theme_id: uploadThemeId || null,
      })
      if (insertError) {
        await supabase.storage.from('media').remove([path])
        throw new Error(insertError.message)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadingFileName(null)
      e.target.value = ''
    }
  }

  function startEdit(item: MediaLibraryItem) {
    setEditingId(item.id)
    setEditingName(item.name)
    setEditingUrl(item.file_url ?? '')
    setEditingThemeId(item.theme_id ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName('')
    setEditingUrl('')
    setEditingThemeId('')
  }

  async function saveTrack() {
    if (!editingId || savingId) return
    const name = editingName.trim()
    if (!name) {
      setError('Track name cannot be empty.')
      return
    }
    setSavingId(editingId)
    setError('')
    const { error: updateError } = await supabase
      .from('media_library')
      .update({
        name,
        file_url: editingUrl.trim() || null,
        theme_id: editingThemeId || null,
      })
      .eq('id', editingId)
    if (updateError) {
      setError(updateError.message)
    } else {
      cancelEdit()
      await load()
    }
    setSavingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-4">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'upload' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setTab('library')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'library' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Indexed media
        </button>
      </div>

      {tab === 'upload' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Upload file</h2>
          <p className="text-slate-400 text-sm mb-4">
            MP3 or MP4, max 100 MB. Optionally assign a theme so this file appears under that theme.
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
                  <option key={t.id} value={t.id}>{t.name}</option>
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
            {uploading && uploadingFileName ? `Uploading: ${uploadingFileName}` : uploading ? 'Uploading…' : 'Choose MP3 or MP4'}
          </label>
        </div>
      )}

      {tab === 'library' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-1">Indexed media</h2>
          <p className="text-slate-500 text-sm mb-4">
            Edit a track and click Save to store the name and URL — they persist after refresh.
          </p>
          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-slate-500">
              No files yet. Upload MP3 or MP4 to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 py-3 border-b border-slate-700/50 last:border-0"
                >
                  {editingId === item.id ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Track name"
                          className="flex-1 min-w-[180px] rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                        <span className="text-slate-500 text-sm shrink-0">
                          {item.file_type.toUpperCase()}
                          {item.file_size_bytes ? ` · ${(item.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="url"
                          value={editingUrl}
                          onChange={(e) => setEditingUrl(e.target.value)}
                          placeholder="File URL (optional)"
                          className="flex-1 min-w-[200px] rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                        />
                      </div>
                      {themes.length > 0 && (
                        <div>
                          <label className="block text-slate-400 text-sm mb-1">Theme</label>
                          <select
                            value={editingThemeId}
                            onChange={(e) => setEditingThemeId(e.target.value)}
                            className="rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          >
                            <option value="">No theme</option>
                            {themes.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveTrack}
                          disabled={savingId === item.id || !editingName.trim()}
                          className="rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-medium py-1.5 px-4 text-sm"
                        >
                          {savingId === item.id ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={savingId === item.id}
                          className="rounded-full border border-slate-500 text-slate-300 hover:bg-slate-700 font-medium py-1.5 px-4 text-sm disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-4">
                      {item.album_art_url ? (
                        <img
                          src={item.album_art_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-100 font-medium truncate">{mediaDisplayName(item)}</p>
                        {item.name !== mediaDisplayName(item) && (
                          <p className="text-slate-500 text-xs truncate">{item.name}</p>
                        )}
                        {item.theme_id && (
                          <p className="text-slate-500 text-xs truncate">
                            Theme: {themes.find((t) => t.id === item.theme_id)?.name ?? item.theme_id}
                          </p>
                        )}
                      </div>
                      <span className="text-slate-500 text-sm shrink-0">
                        {item.file_type.toUpperCase()}
                        {item.file_size_bytes ? ` · ${(item.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-1.5 px-3 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
