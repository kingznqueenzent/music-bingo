'use client'

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { BingoCard } from '@/components/bingo/BingoCard'
import { getFreeCenterPosition } from '@/lib/bingo-win-pattern'
import { buildDemoCells, DEMO_SONGS } from './mock-songs'

const BOARD_SIZE = 5

function LegendSwatch({
  label,
  className,
  children,
}: {
  label: string
  className: string
  children?: ReactNode
}) {
  return (
    <li className="flex items-center gap-2 text-xs text-white/70">
      <span
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] ${className}`}
        aria-hidden
      >
        {children}
      </span>
      {label}
    </li>
  )
}

export function BingoDemoClient() {
  const gridRef = useRef<HTMLDivElement>(null)
  const cells = useMemo(() => buildDemoCells(DEMO_SONGS), [])
  const freePosition = getFreeCenterPosition(BOARD_SIZE)

  const [evilMode, setEvilMode] = useState(false)
  const [markedSongIds, setMarkedSongIds] = useState<Set<string>>(() => new Set())
  const [playedSongIds, setPlayedSongIds] = useState<Set<string>>(() => new Set())
  const [activeSongId, setActiveSongId] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)

  const playableCells = useMemo(
    () =>
      [...cells]
        .filter((cell) => cell.position !== freePosition)
        .sort((a, b) => a.position - b.position),
    [cells, freePosition]
  )

  const uncalledCells = useMemo(
    () => playableCells.filter((cell) => !playedSongIds.has(cell.playlistSongId)),
    [playableCells, playedSongIds]
  )

  const handleMarkChange = useCallback((playlistSongId: string, marked: boolean) => {
    setMarkedSongIds((prev) => {
      const next = new Set(prev)
      if (marked) next.add(playlistSongId)
      else next.delete(playlistSongId)
      return next
    })
  }, [])

  const handleCallNext = useCallback(() => {
    if (uncalledCells.length === 0) {
      setLastAction('All songs have already been called.')
      return
    }
    const pick = uncalledCells[Math.floor(Math.random() * uncalledCells.length)]
    setPlayedSongIds((prev) => new Set(prev).add(pick.playlistSongId))
    setActiveSongId(pick.playlistSongId)
    const label = pick.title ?? pick.label
    setLastAction(`Called: ${label}${pick.artist ? ` — ${pick.artist}` : ''}`)
  }, [uncalledCells])

  const handleWrongTap = useCallback(() => {
    const target = uncalledCells[0]
    if (!target) {
      setLastAction('Every song is already called — reset the board to test wrong taps.')
      return
    }

    const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>('.bingo-grid button')
    const buttonIndex = playableCells.findIndex((cell) => cell.playlistSongId === target.playlistSongId)
    const button = buttons?.[buttonIndex]
    if (!button) {
      setLastAction('Could not locate tile — tap an uncalled square manually.')
      return
    }

    button.click()
    setLastAction(`Wrong tap on uncalled tile: ${target.title ?? target.label}`)
  }, [playableCells, uncalledCells])

  const handleReset = useCallback(() => {
    setMarkedSongIds(new Set())
    setPlayedSongIds(new Set())
    setActiveSongId(null)
    setLastAction('Board reset — free space stays marked.')
  }, [])

  return (
    <main className="min-h-dvh bg-[#121212] text-white px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 text-center sm:text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-neon/80 font-semibold mb-1">
            LyricGrid Sandbox
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Bingo Card Demo</h1>
          <p className="mt-2 text-sm text-white/55 max-w-xl mx-auto sm:mx-0">
            Interactive sandbox — no auth or live session. Tap tiles, call songs, and test animations &
            haptics.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,18rem)_minmax(0,28rem)] gap-6 lg:gap-8 items-start justify-center lg:justify-center">
          <aside className="order-2 lg:order-1 space-y-4 w-full max-w-md mx-auto lg:max-w-none lg:mx-0">
            <section className="rounded-2xl border border-white/10 bg-[#1E1E1E] p-4 shadow-[0_0_24px_rgba(0,255,102,0.06)]">
              <h2 className="text-xs uppercase tracking-widest text-brand-neon/90 font-bold mb-3">
                Controls
              </h2>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setEvilMode((v) => !v)}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors touch-manipulation ${
                    evilMode
                      ? 'bg-brand-neon/15 border-brand-neon/50 text-brand-neon'
                      : 'bg-white/5 border-white/10 text-white hover:border-brand-neon/30'
                  }`}
                >
                  {evilMode ? 'Evil Mode: ON' : 'Evil Mode: OFF'}
                </button>
                <button
                  type="button"
                  onClick={handleCallNext}
                  disabled={uncalledCells.length === 0}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold bg-brand-neon text-[#121212] hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation shadow-[0_0_16px_rgba(0,255,102,0.25)]"
                >
                  Call Next Song
                  {uncalledCells.length > 0 ? ` (${uncalledCells.length} left)` : ''}
                </button>
                <button
                  type="button"
                  onClick={handleWrongTap}
                  disabled={uncalledCells.length === 0}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold bg-white/5 border border-red-400/40 text-red-300 hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
                >
                  Test Wrong Tap
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold bg-white/5 border border-white/10 text-white/80 hover:border-white/25 transition-colors touch-manipulation"
                >
                  Reset Board
                </button>
              </div>
              {lastAction ? (
                <p className="mt-3 text-xs text-white/50 leading-relaxed" role="status">
                  {lastAction}
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#1E1E1E] p-4">
              <h2 className="text-xs uppercase tracking-widest text-brand-neon/90 font-bold mb-3">
                Tile Legend
              </h2>
              <ul className="space-y-2">
                <LegendSwatch
                  label="Default — tap after host calls"
                  className="bg-[#1E1E1E] border-white/5 text-white/80"
                />
                <LegendSwatch
                  label="Called & marked — green glow + checkmark"
                  className="bg-brand-neon/15 border-brand-neon/60 text-brand-neon"
                >
                  ✓
                </LegendSwatch>
                <LegendSwatch
                  label="Currently called — outer glow"
                  className="bg-[#1E1E1E] border-brand-neon/40 text-brand-neon bingo-cell-called-glow"
                />
                <LegendSwatch
                  label="Wrong tap — red shake + error haptic"
                  className="bg-[#1E1E1E] border-red-400/40 text-red-300 animate-bingo-wrong"
                >
                  !
                </LegendSwatch>
                <LegendSwatch
                  label="Evil mode — uncalled titles show ?"
                  className="bg-[#1E1E1E] border-white/10 text-white/50"
                >
                  ?
                </LegendSwatch>
                <LegendSwatch
                  label="Free space — always marked"
                  className="bg-brand-neon/10 border-brand-neon/40 text-brand-neon"
                >
                  ⭐
                </LegendSwatch>
              </ul>
            </section>

            <p className="text-xs text-white/45 text-center lg:text-left px-1">
              Called: {playedSongIds.size} / {playableCells.length} · Marked: {markedSongIds.size}
            </p>
          </aside>

          <div ref={gridRef} className="order-1 lg:order-2 w-full max-w-md mx-auto">
            {evilMode ? (
              <p className="mb-3 text-center text-xs uppercase tracking-widest text-brand-neon/80 font-semibold">
                Evil Mode — uncalled titles hidden
              </p>
            ) : null}
            <BingoCard
              size={BOARD_SIZE}
              cells={cells}
              markedSongIds={markedSongIds}
              playedSongIds={playedSongIds}
              activeSongId={activeSongId}
              evilMode={evilMode}
              onMarkChange={handleMarkChange}
            />
            <p className="mt-4 text-white/55 text-sm text-center leading-relaxed">
              Tap squares after the host calls them. Gold flash = correct mark · Red shake = not played
              yet.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
