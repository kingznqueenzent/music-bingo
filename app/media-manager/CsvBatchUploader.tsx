'use client'

import { useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, X, AlertCircle, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildThemeLookup, resolveThemeId, type CsvTheme } from '@/lib/media/resolve-theme-from-csv'
import type { ParsedSong } from '@/lib/media/song-catalog-types'
import { enrichParsedSongsWithAutoCategory } from '@/lib/media/enrich-parsed-songs'

export type { CsvTheme }
export type { ParsedSong }

/** Parse CSV text into song rows; auto-matches theme_name to theme IDs. */
export function parseSongsCsv(text: string, themes: CsvTheme[]): ParsedSong[] {
  const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const themeLookup = buildThemeLookup(themes)

  const rows: ParsedSong[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',')
    const cleanValues = values.map((v) => v.trim().replace(/^"|"$/g, ''))
    if (cleanValues.length === 0 || !cleanValues[0]) continue

    const rowObj: Record<string, string> = {}
    headers.forEach((header, index) => {
      rowObj[header] = cleanValues[index] || ''
    })

    const rawTheme = rowObj['theme_name'] || rowObj['theme'] || ''
    const matchedThemeId = resolveThemeId(rawTheme, themeLookup)

    rows.push({
      title: rowObj['title'] || 'Untitled',
      artist: rowObj['artist'] || null,
      year: rowObj['year'] ? parseInt(rowObj['year'], 10) : null,
      theme_id: matchedThemeId,
      theme_name_raw: rawTheme || undefined,
      youtube_url: rowObj['youtube_url'] || null,
      start_time_sec: rowObj['start_time_sec'] ? parseInt(rowObj['start_time_sec'], 10) : 0,
      duration_sec: rowObj['duration_sec'] ? parseInt(rowObj['duration_sec'], 10) : 35,
    })
  }

  return rows
}

export function CsvBatchUploader({
  themes,
  onUploadSuccess,
}: {
  themes: CsvTheme[]
  onUploadSuccess: () => void
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedSong[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [autoTaggedCount, setAutoTaggedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid .csv file.')
      return
    }
    setError(null)
    setSuccessMessage(null)
    setAutoTaggedCount(0)
    const reader = new FileReader()
    reader.onload = (e) => {
      void (async () => {
        const content = e.target?.result as string
        const parsed = parseSongsCsv(content, themes)
        if (parsed.length === 0) {
          setError('No valid song rows found in CSV.')
          return
        }

        setIsCategorizing(true)
        setError(null)
        try {
          const { rows, autoTagged } = await enrichParsedSongsWithAutoCategory(parsed, themes)
          setParsedData(rows)
          setAutoTaggedCount(autoTagged)
        } catch (err) {
          console.warn('[CsvBatchUploader] auto-categorize fallback:', err)
          setParsedData(parsed)
        } finally {
          setIsCategorizing(false)
        }
      })()
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleBatchInsert = async () => {
    if (parsedData.length === 0) return
    setIsUploading(true)
    setError(null)
    setSuccessMessage(null)

    const payload = parsedData.map(({ theme_name_raw: _raw, ...song }) => ({
      ...song,
      media_type: song.youtube_url ? 'youtube' : 'audio',
    }))

    const count = payload.length

    try {
      const res = await fetch('/api/songs/batch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: payload }),
      })
      const body = (await res.json()) as { error?: string; count?: number }

      if (!res.ok) {
        const { error: insertError } = await supabase.from('songs').insert(payload)
        if (insertError) throw new Error(body.error ?? insertError.message)
      }

      setParsedData([])
      setSuccessMessage(`Imported ${body.count ?? count} tracks into the catalog.`)
      onUploadSuccess()
    } catch (e) {
      setError(`Upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-[#1E1E1E] rounded-xl border border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#00FFFF] flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Batch CSV Song Uploader
        </h3>
        {parsedData.length > 0 ? (
          <button
            type="button"
            onClick={() => setParsedData([])}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Clear Preview
          </button>
        ) : null}
      </div>

      {isCategorizing ? (
        <div className="border border-[#00FFFF]/30 rounded-xl p-8 text-center text-sm text-gray-400">
          <Sparkles className="w-8 h-8 text-[#00FFFF] mx-auto mb-3 animate-pulse" />
          Auto-categorizing tracks…
        </div>
      ) : parsedData.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#00FFFF] bg-[#00FFFF]/5 scale-[0.99]'
              : 'border-white/20 hover:border-[#00FFFF]/50 hover:bg-white/[0.02]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
            className="hidden"
          />
          <UploadCloud className="w-10 h-10 text-[#00FFFF] mx-auto mb-3 opacity-80" />
          <p className="text-sm font-medium text-white">
            Drag and drop your <span className="text-[#00FFFF]">.CSV file</span> here, or click to browse
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Headers: title, artist, year, theme_name, youtube_url, start_time_sec, duration_sec
          </p>
          <p className="text-xs text-[#00FFFF]/70 mt-2 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            Missing themes auto-detected from keywords + MusicBrainz
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-white/5 text-xs text-gray-300">
            <span>
              Ready to import <strong className="text-[#00FFFF]">{parsedData.length} tracks</strong>
            </span>
            <span className="text-gray-500">
              Auto-matched theme names: {parsedData.filter((p) => p.theme_id).length} / {parsedData.length}
              {autoTaggedCount > 0 ? ` · ${autoTaggedCount} auto-tagged` : ''}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto border border-white/10 rounded-lg divide-y divide-white/5 bg-[#121212] text-xs">
            {parsedData.slice(0, 50).map((song, idx) => (
              <div key={idx} className="p-2.5 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 font-medium text-white truncate">{song.title}</div>
                <div className="col-span-3 text-gray-400 truncate">{song.artist || '—'}</div>
                <div className="col-span-2 text-[#00FFFF]">{song.year || '—'}</div>
                <div className="col-span-3 text-gray-300 truncate">
                  {song.theme_id ? (
                    <span className="text-emerald-400">✓ {song.theme_name_raw}</span>
                  ) : song.theme_name_raw ? (
                    <span className="text-yellow-400">? {song.theme_name_raw}</span>
                  ) : (
                    <span className="text-gray-600">Unassigned</span>
                  )}
                </div>
              </div>
            ))}
            {parsedData.length > 50 ? (
              <div className="p-2 text-center text-gray-500 italic">
                + {parsedData.length - 50} more tracks in queue…
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setParsedData([])}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleBatchInsert()}
              disabled={isUploading}
              className="px-5 py-2 rounded-lg bg-[#00FFFF] text-black font-semibold text-xs hover:bg-[#00FFFF]/80 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? 'Uploading to Supabase…' : `Upload ${parsedData.length} Tracks`}
            </button>
          </div>
        </div>
      )}

      {successMessage ? (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      ) : null}
    </div>
  )
}
