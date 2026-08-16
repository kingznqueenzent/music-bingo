'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Volume2, Upload, Pencil, Trash2 } from 'lucide-react'
import { broadcastSoundEffect } from '@/lib/supabase-realtime'
import { SFX_PRESETS, type SfxPresetId } from '@/lib/sfx/sfx-presets'
import { playSoundEffect, preloadSfxAssets, readSfxVolume, writeSfxVolume } from '@/lib/sfx/play-sfx'

export type SfxAsset = {
  id: string
  game_id: string
  name: string
  file_path: string
  file_url: string
  file_type: 'mp3' | 'wav'
  file_size_bytes?: number | null
  created_at?: string
}

export type HostSoundboardProps = {
  gameId: string
  supabase: SupabaseClient
  className?: string
}

export function HostSoundboard({ gameId, supabase, className = '' }: HostSoundboardProps) {
  const [assets, setAssets] = useState<SfxAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [volume, setVolume] = useState(0.8)
  const [triggering, setTriggering] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setVolume(readSfxVolume())
    preloadSfxAssets()
  }, [])

  const loadAssets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sfx-assets?gameId=${encodeURIComponent(gameId)}`)
      const data = (await res.json()) as { assets?: SfxAsset[]; error?: string; warning?: string }
      if (data.assets) setAssets(data.assets)
      if (data.warning) setStatus(data.warning)
    } catch {
      setStatus('Could not load soundboard')
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    void loadAssets()
  }, [loadAssets])

  function handleVolumeChange(next: number) {
    const clamped = Math.max(0, Math.min(1, next))
    setVolume(clamped)
    writeSfxVolume(clamped)
  }

  async function triggerSfx(payload: {
    presetId?: SfxPresetId
    url?: string
    name: string
    key: string
  }) {
    setTriggering(payload.key)
    setStatus('')
    try {
      playSoundEffect({ presetId: payload.presetId, url: payload.url, name: payload.name, volume })
      await broadcastSoundEffect(supabase, gameId, {
        presetId: payload.presetId,
        url: payload.url,
        name: payload.name,
        volume,
      })
    } catch {
      setStatus('Broadcast failed — played locally only')
    } finally {
      window.setTimeout(() => setTriggering(null), 350)
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setStatus('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('gameId', gameId)
      form.append('name', file.name.replace(/\.[^.]+$/, ''))
      const res = await fetch('/api/sfx-assets', { method: 'POST', body: form })
      const data = (await res.json()) as SfxAsset & { error?: string }
      if (!res.ok) {
        setStatus(data.error ?? 'Upload failed')
        return
      }
      setAssets((prev) => [data, ...prev])
      setStatus('Uploaded')
      window.setTimeout(() => setStatus(''), 2500)
    } catch {
      setStatus('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function saveRename(id: string) {
    const name = editName.trim()
    if (!name) return
    const res = await fetch(`/api/sfx-assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = (await res.json()) as SfxAsset & { error?: string }
    if (!res.ok) {
      setStatus(data.error ?? 'Rename failed')
      return
    }
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, name: data.name } : a)))
    setEditingId(null)
    setEditName('')
  }

  async function deleteAsset(id: string) {
    const res = await fetch(`/api/sfx-assets/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      setStatus(data.error ?? 'Delete failed')
      return
    }
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-50 flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-[#00FF66]" aria-hidden />
            DJ Soundboard
          </h3>
          <p className="text-slate-500 text-sm">
            Local FX + custom clips — plays over the track without stopping bed audio; broadcasts to Stage &amp;
            overlay
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-full bg-[#00FF66] hover:bg-green-300 disabled:opacity-40 text-[#121212] font-bold px-4 py-2 text-xs inline-flex items-center gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUpload(file)
          }}
        />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label htmlFor="sfx-volume" className="text-xs font-semibold text-slate-400 shrink-0">
          Volume
        </label>
        <input
          id="sfx-volume"
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
          className="flex-1 accent-[#00FF66] h-2"
        />
        <span className="text-xs tabular-nums text-[#00FF66] w-8 text-right">{Math.round(volume * 100)}%</span>
      </div>

      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Built-in presets</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
        {SFX_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={triggering === preset.id}
            onClick={() =>
              void triggerSfx({ presetId: preset.id, name: preset.label, key: preset.id })
            }
            className="rounded-xl border border-[#00FF66]/30 bg-[#00FF66]/5 hover:bg-[#00FF66]/15 active:scale-95 disabled:opacity-50 transition-all px-2 py-2.5 text-center"
          >
            <span className="text-lg block" aria-hidden>
              {preset.emoji}
            </span>
            <span className="text-xs font-bold text-[#00FF66]">{preset.label}</span>
          </button>
        ))}
      </div>

      {status ? <p className="text-emerald-400/90 text-xs mb-3">{status}</p> : null}

      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Custom clips</p>
      {loading ? (
        <p className="text-slate-500 text-sm py-4">Loading clips…</p>
      ) : assets.length === 0 ? (
        <p className="text-slate-500 text-sm py-4 border border-dashed border-slate-700 rounded-xl text-center px-4">
          No custom SFX yet — upload MP3 or WAV clips for your stream.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative rounded-xl border border-slate-700 bg-slate-800/80 p-2 flex flex-col gap-1"
            >
              {editingId === asset.id ? (
                <div className="flex gap-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg bg-slate-900 border border-slate-600 px-2 py-1 text-xs text-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveRename(asset.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void saveRename(asset.id)}
                    className="text-[#00FF66] text-xs font-bold px-1"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={triggering === asset.id}
                  onClick={() =>
                    void triggerSfx({
                      url: asset.file_url,
                      name: asset.name,
                      key: asset.id,
                    })
                  }
                  className="text-left text-sm font-semibold text-slate-100 truncate hover:text-[#00FF66] transition-colors disabled:opacity-50"
                  title={asset.name}
                >
                  {asset.name}
                </button>
              )}
              <div className="flex items-center justify-between gap-1 opacity-70 group-hover:opacity-100">
                <span className="text-[10px] uppercase text-slate-500">{asset.file_type}</span>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(asset.id)
                      setEditName(asset.name)
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                    aria-label={`Rename ${asset.name}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteAsset(asset.id)}
                    className="p-1 text-slate-400 hover:text-red-400"
                    aria-label={`Delete ${asset.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
