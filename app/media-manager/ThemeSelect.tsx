'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import type { CatalogTheme } from './types'

const BG = '#121212'
const PANEL = '#1E1E1E'
const NEON = '#00FFFF'

export type ThemeSelectProps = {
  id?: string
  value: string
  onChange: (themeId: string) => void
  themes: CatalogTheme[]
  /** Shown when value is empty */
  emptyLabel?: string
  disabled?: boolean
  className?: string
  /** Optional counts shown beside theme names (filter bar). */
  themeCounts?: Record<string, number>
  /** Prefer opening the menu upward (bulk toolbar). */
  preferUp?: boolean
  'aria-label'?: string
}

type MenuPos = { top: number; left: number; width: number; maxHeight: number; openUp: boolean }

/**
 * Custom theme picker — avoids native &lt;select&gt; on mobile, which can trigger
 * viewport jumps / auth refresh races that flash login ↔ Media Manager.
 */
export function ThemeSelect({
  id,
  value,
  onChange,
  themes,
  emptyLabel = 'Unassigned',
  disabled = false,
  className = '',
  themeCounts,
  preferUp = false,
  'aria-label': ariaLabel = 'Theme',
}: ThemeSelectProps) {
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<MenuPos | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const sorted = useMemo(
    () => [...themes].sort((a, b) => a.name.localeCompare(b.name)),
    [themes]
  )

  const selectedLabel = useMemo(() => {
    if (!value) return emptyLabel
    return sorted.find((t) => t.id === value)?.name ?? emptyLabel
  }, [value, sorted, emptyLabel])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((t) => t.name.toLowerCase().includes(q))
  }, [sorted, query])

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gutter = 8
    const viewportH = window.innerHeight
    const spaceBelow = viewportH - rect.bottom - gutter
    const spaceAbove = rect.top - gutter
    const openUp = preferUp || (spaceBelow < 220 && spaceAbove > spaceBelow)
    const maxHeight = Math.max(160, Math.min(320, openUp ? spaceAbove : spaceBelow))
    setPos({
      top: openUp ? rect.top - gutter : rect.bottom + gutter,
      left: Math.min(rect.left, window.innerWidth - rect.width - gutter),
      width: Math.max(rect.width, 200),
      maxHeight,
      openUp,
    })
  }, [preferUp])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const onReposition = () => updatePosition()
    window.addEventListener('resize', onReposition)
    // Capture scroll from any container without fighting the menu itself.
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    setQuery('')
    const t = window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus({ preventScroll: true })
      }
    }
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer, { passive: true })
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open])

  function pick(next: string) {
    onChange(next)
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

  const menu =
    mounted && open && pos
      ? createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className="fixed z-[10050] rounded-xl border border-white/15 shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
            style={
              pos.openUp
                ? {
                    left: pos.left,
                    width: pos.width,
                    maxHeight: pos.maxHeight,
                    backgroundColor: PANEL,
                    bottom: Math.max(8, window.innerHeight - pos.top),
                  }
                : {
                    left: pos.left,
                    width: pos.width,
                    maxHeight: pos.maxHeight,
                    backgroundColor: PANEL,
                    top: pos.top,
                  }
            }
          >
            {sorted.length > 8 ? (
              <div className="p-2 border-b border-white/10 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter themes…"
                    className="w-full rounded-lg border border-white/10 pl-8 pr-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#00FFFF]/50"
                    style={{ backgroundColor: BG }}
                    autoComplete="off"
                    // Prevent iOS from scrolling the page under the portal.
                    onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'nearest' })}
                  />
                </div>
              </div>
            ) : null}

            <ul className="overflow-y-auto overscroll-contain py-1" role="presentation">
              <li role="option" aria-selected={value === ''}>
                <button
                  type="button"
                  onClick={() => pick('')}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 min-h-11 text-left text-sm touch-manipulation ${
                    value === ''
                      ? 'text-[#00FFFF] bg-[#00FFFF]/10'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex-1 truncate">{emptyLabel}</span>
                  {value === '' ? <Check className="w-4 h-4 shrink-0" style={{ color: NEON }} /> : null}
                </button>
              </li>
              {filtered.map((t) => {
                const active = value === t.id
                const count = themeCounts?.[t.id]
                return (
                  <li key={t.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => pick(t.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 min-h-11 text-left text-sm touch-manipulation ${
                        active
                          ? 'text-[#00FFFF] bg-[#00FFFF]/10'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex-1 truncate">
                        {t.name}
                        {typeof count === 'number' ? (
                          <span className="text-gray-500 ml-1">({count})</span>
                        ) : null}
                      </span>
                      {active ? <Check className="w-4 h-4 shrink-0" style={{ color: NEON }} /> : null}
                    </button>
                  </li>
                )
              })}
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-sm text-gray-500 text-center">No themes match</li>
              ) : null}
            </ul>
          </div>,
          document.body
        )
      : null

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return
          setOpen((o) => !o)
        }}
        className="w-full max-w-full flex items-center gap-2 border border-white/15 rounded-xl px-3 py-2.5 min-h-11 text-sm text-gray-200 text-left touch-manipulation disabled:opacity-50 focus:border-[#00FFFF]/50 outline-none"
        style={{ backgroundColor: BG }}
      >
        <span className="flex-1 truncate">{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  )
}
