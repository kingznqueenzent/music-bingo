'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: { videoId: string; events?: { onReady: (e: { target: YTPlayer }) => void } }) => YTPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface YTPlayer {
  loadVideoById(opts: { videoId: string; startSeconds?: number; endSeconds?: number }): void
  playVideo(): void
  stopVideo(): void
  getPlayerState(): number
}

const YT_ENDED = 0

interface YouTubeClipPlayerProps {
  videoId: string
  startSeconds?: number
  endSeconds?: number
  crossfadeSeconds?: number
  autoPlay?: boolean
  onEnded?: () => void
  className?: string
}

export function YouTubeClipPlayer({
  videoId,
  startSeconds = 0,
  endSeconds = 20,
  crossfadeSeconds = 0,
  autoPlay = true,
  onEnded,
  className = '',
}: YouTubeClipPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ready, setReady] = useState(false)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (!videoId || !containerRef.current) return

    const stopCheck = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (clipTimerRef.current) {
        clearTimeout(clipTimerRef.current)
        clipTimerRef.current = null
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
    }

    const startTimeCheck = () => {
      intervalRef.current = setInterval(() => {
        const p = playerRef.current
        if (!p) return
        const state = p.getPlayerState?.()
        if (state === YT_ENDED) {
          stopCheck()
          onEnded?.()
        }
      }, 500)
    }

    const durationMs = (endSeconds - startSeconds) * 1000
    const fadeMs = Math.min(crossfadeSeconds * 1000, durationMs - 500)
    const startClipTimer = () => {
      if (fadeMs > 0) {
        fadeTimerRef.current = setTimeout(() => {
          setOpacity(0)
        }, durationMs - fadeMs)
      }
      clipTimerRef.current = setTimeout(() => {
        if (fadeTimerRef.current) {
          clearTimeout(fadeTimerRef.current)
          fadeTimerRef.current = null
        }
        setOpacity(1)
        playerRef.current?.stopVideo?.()
        stopCheck()
        onEnded?.()
      }, durationMs)
    }

    const loadAPI = () => {
      if (window.YT?.Player) {
        initPlayer()
        return
      }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScript = document.getElementsByTagName('script')[0]
      firstScript?.parentNode?.insertBefore(tag, firstScript)
      window.onYouTubeIframeAPIReady = () => initPlayer()
    }

    const initPlayer = () => {
      if (!containerRef.current || !window.YT) return
      new window.YT.Player(containerRef.current, {
        videoId,
        events: {
          onReady(e: { target: YTPlayer }) {
            playerRef.current = e.target
            e.target.loadVideoById({
              videoId,
              startSeconds,
              endSeconds,
            })
            setReady(true)
            if (autoPlay) e.target.playVideo()
            startClipTimer()
            startTimeCheck()
          },
        },
      })
    }

    loadAPI()
    return () => {
      stopCheck()
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
      setOpacity(1)
      playerRef.current = null
    }
  }, [videoId, startSeconds, endSeconds, crossfadeSeconds, autoPlay, onEnded])

  useEffect(() => {
    if (!ready || !playerRef.current || !videoId) return
    playerRef.current.loadVideoById({ videoId, startSeconds, endSeconds })
    if (autoPlay) playerRef.current.playVideo()
  }, [videoId, startSeconds, endSeconds, autoPlay, ready])

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ opacity, transition: crossfadeSeconds > 0 ? `opacity ${crossfadeSeconds}s ease-out` : undefined }}
    >
      <div ref={containerRef} className="aspect-video w-full rounded-xl bg-black" />
    </div>
  )
}
