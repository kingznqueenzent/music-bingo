'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Download } from 'lucide-react'
import { roomUrl } from '@/lib/room-url'

export type VenueAssetsPanelProps = {
  gameCode: string
  /** Compact embed for live header; full = download-focused panel */
  variant?: 'full' | 'compact'
  className?: string
}

export function VenueAssetsPanel({
  gameCode,
  variant = 'full',
  className = '',
}: VenueAssetsPanelProps) {
  const code = gameCode.trim()
  const url = roomUrl(code)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      window.prompt('Copy room link:', url)
    }
  }, [url])

  const downloadPng = useCallback(() => {
    const canvas = canvasWrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `lyricgrid-room-${code || 'qr'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [code])

  if (!code) {
    return (
      <div className={`rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-slate-400 ${className}`}>
        Game code unavailable — reload the host dashboard.
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {mounted ? (
          <div className="rounded-xl bg-white p-2.5">
            <QRCodeSVG value={url} size={112} level="H" includeMargin={false} />
          </div>
        ) : (
          <div className="h-[136px] w-[136px] animate-pulse rounded-xl bg-slate-700" />
        )}
        <p className="text-[10px] text-slate-500 text-center max-w-[140px] break-all">{url}</p>
      </div>
    )
  }

  return (
    <section
      className={`rounded-2xl border border-[#00FF66]/25 bg-slate-900/70 shadow-md shadow-black/40 p-4 sm:p-6 space-y-5 ${className}`}
      aria-label="Venue assets and QR code"
    >
      <div>
        <h3 className="text-xl font-bold text-slate-50">Venue Assets / QR Code</h3>
        <p className="text-slate-400 text-sm mt-1">
          High-resolution code for stage overlays, projectors, and table tents. Scans open{' '}
          <span className="text-[#00FF66]/90">lyricgrid.ca/room/{code}</span>.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="rounded-2xl bg-white p-4 shadow-lg">
          {mounted ? (
            <QRCodeSVG value={url} size={280} level="H" includeMargin />
          ) : (
            <div className="h-[280px] w-[280px] animate-pulse bg-slate-200 rounded" />
          )}
        </div>

        {/* Off-screen high-res canvas for PNG download */}
        <div ref={canvasWrapRef} className="absolute -left-[9999px] top-0" aria-hidden>
          {mounted ? (
            <QRCodeCanvas value={url} size={1024} level="H" includeMargin />
          ) : null}
        </div>

        <div className="flex-1 min-w-0 space-y-4 w-full">
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Room link</p>
            <p className="text-sm text-[#00FF66] break-all font-mono">{url}</p>
            <p className="text-slate-500 text-xs mt-2">
              Room code: <span className="text-emerald-400 font-bold text-lg tracking-widest">{code}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full border border-[#00FF66]/50 px-5 text-sm font-semibold text-[#00FF66] hover:bg-[#00FF66]/10 touch-manipulation"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Room Link'}
            </button>
            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 px-5 text-sm font-semibold text-slate-950 touch-manipulation"
            >
              <Download className="w-4 h-4" />
              Download QR Asset
            </button>
          </div>

          <p className="text-slate-500 text-xs">
            PNG export is 1024×1024 at error-correction H — crisp on large screens and print.
          </p>
        </div>
      </div>
    </section>
  )
}
