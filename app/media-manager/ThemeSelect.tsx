'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { ResponsiveMenu } from '@/components/ui/menu/ResponsiveMenu'
import { MENU_TOKENS } from '@/components/ui/menu/tokens'
import { formatTrackCountLabel } from '@/lib/media/theme-track-counts'
import type { CatalogTheme } from './types'

export type ThemeSelectProps = {
  id?: string
  value: string
  onChange: (themeId: string) => void
  themes: CatalogTheme[]
  /** Shown when value is empty */
  emptyLabel?: string
  disabled?: boolean
  className?: string
  /** Optional counts shown beside theme names (filter bar / upload / row). */
  themeCounts?: Record<string, number>
  /** Prefer opening the menu upward on desktop (bulk toolbar). */
  preferUp?: boolean
  'aria-label'?: string
}

function TrackCountBadge({ count }: { count: number }) {
  const empty = count === 0
  return (
    <span
      className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums border ${
        empty
          ? 'border-white/10 text-white/35 bg-white/5'
          : 'border-[#00FFFF]/35 text-[#00FFFF]/90 bg-[#00FFFF]/10'
      }`}
    >
      {formatTrackCountLabel(count)}
    </span>
  )
}

/**
 * Theme picker — mobile bottom sheet / desktop Floating UI popover.
 * Avoids native &lt;select&gt; focus races that flash login ↔ Media Manager.
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
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const sorted = useMemo(
    () => [...themes].sort((a, b) => a.name.localeCompare(b.name)),
    [themes]
  )

  const selectedTheme = useMemo(
    () => (value ? sorted.find((t) => t.id === value) : undefined),
    [value, sorted]
  )

  const selectedLabel = value ? selectedTheme?.name ?? emptyLabel : emptyLabel
  const selectedCount =
    value && themeCounts && typeof themeCounts[value] === 'number'
      ? themeCounts[value]
      : undefined

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((t) => t.name.toLowerCase().includes(q))
  }, [sorted, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    const t = window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 80)
    return () => window.clearTimeout(t)
  }, [open])

  function pick(next: string) {
    onChange(next)
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

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
        className="w-full max-w-full flex items-center gap-2 border border-white/15 rounded-xl px-3 py-3 min-h-12 text-sm text-gray-200 text-left touch-manipulation disabled:opacity-50 focus:border-[#00FFFF]/50 outline-none active:bg-white/5"
        style={{ backgroundColor: MENU_TOKENS.dark }}
      >
        <span className="flex-1 truncate min-w-0">{selectedLabel}</span>
        {typeof selectedCount === 'number' ? <TrackCountBadge count={selectedCount} /> : null}
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <ResponsiveMenu
        open={open}
        onClose={() => setOpen(false)}
        title={ariaLabel}
        description="Choose a theme or genre"
        anchorRef={triggerRef}
        placement={preferUp ? 'top-end' : 'bottom-start'}
        desktopWidthClass="w-80 min-w-[16rem]"
        role="listbox"
      >
        <div id={listId} className="flex flex-col gap-1">
          {sorted.length > 8 ? (
            <div className="pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter themes…"
                  className="w-full rounded-xl border border-white/10 pl-10 pr-3 py-3 min-h-12 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#00FFFF]/50"
                  style={{ backgroundColor: MENU_TOKENS.dark }}
                  autoComplete="off"
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            role="option"
            aria-selected={value === ''}
            onClick={() => pick('')}
            className={`${MENU_TOKENS.itemBaseClass} ${
              value === '' ? MENU_TOKENS.itemActiveClass : MENU_TOKENS.itemIdleClass
            }`}
          >
            <span className="flex-1 truncate text-left">{emptyLabel}</span>
            {value === '' ? <Check className="w-4 h-4 shrink-0" style={{ color: MENU_TOKENS.accent }} /> : null}
          </button>

          {filtered.map((t) => {
            const active = value === t.id
            const count = themeCounts?.[t.id]
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pick(t.id)}
                className={`${MENU_TOKENS.itemBaseClass} ${
                  active ? MENU_TOKENS.itemActiveClass : MENU_TOKENS.itemIdleClass
                }`}
              >
                <span className="flex-1 truncate text-left min-w-0">{t.name}</span>
                {typeof count === 'number' ? <TrackCountBadge count={count} /> : null}
                {active ? (
                  <Check className="w-4 h-4 shrink-0" style={{ color: MENU_TOKENS.accent }} />
                ) : null}
              </button>
            )
          })}

          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-sm text-white/40 text-center">No themes match</p>
          ) : null}
        </div>
      </ResponsiveMenu>
    </div>
  )
}
