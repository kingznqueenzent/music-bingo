'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface JoinGameQRCodeProps {
  gameCode: string
  size?: number
  className?: string
}

export function JoinGameQRCode({ gameCode, size = 160, className = '' }: JoinGameQRCodeProps) {
  const [joinUrl, setJoinUrl] = useState('')
  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join?code=${encodeURIComponent(gameCode)}`)
  }, [gameCode])

  if (!joinUrl) {
    return <div className={`animate-pulse rounded-xl bg-slate-700 ${className}`} style={{ width: size + 24, height: size + 24 }} />
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="rounded-xl bg-white p-3">
        <QRCodeSVG value={joinUrl} size={size} level="M" includeMargin={false} />
      </div>
      <p className="text-xs text-slate-400 text-center max-w-[200px]">
        Scan to open Join Game with code pre-filled
      </p>
    </div>
  )
}
