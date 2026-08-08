'use client'

import { useEffect, useId, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { ADMIN_NAV_LINKS, isAdminNavActive } from '@/components/layout/admin-nav-links'

export type AdminNavDrawerProps = {
  open: boolean
  onClose: () => void
}

/**
 * Admin navigation panel.
 * Menu open/close is local UI state only — it must not trigger auth revalidation.
 */
export function AdminNavDrawer({ open, onClose }: AdminNavDrawerProps) {
  const pathname = usePathname()
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const scrollYRef = useRef(0)
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    if (!open) return

    // Preserve scroll position — iOS/Android overflow:hidden alone jumps the page and looks like an auth flash.
    scrollYRef.current = window.scrollY
    const { body } = document
    const prevPosition = body.style.position
    const prevTop = body.style.top
    const prevWidth = body.style.width
    const prevOverflow = body.style.overflow

    body.style.position = 'fixed'
    body.style.top = `-${scrollYRef.current}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    const t = window.setTimeout(() => closeBtnRef.current?.focus({ preventScroll: true }), 0)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(t)
      body.style.position = prevPosition
      body.style.top = prevTop
      body.style.width = prevWidth
      body.style.overflow = prevOverflow
      window.scrollTo(0, scrollYRef.current)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      prevPathRef.current = pathname
      return
    }
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname
      onClose()
    }
  }, [pathname, open, onClose])

  useEffect(() => {
    if (!open) return
    panelRef.current?.scrollTo({ top: 0 })
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9998]" role="presentation">
      <button
        type="button"
        aria-label="Close admin menu"
        className="absolute inset-0 bg-black/55 md:bg-black/40 border-0 cursor-default"
        onClick={onClose}
      />

      <nav
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={[
          'absolute z-[9999] flex flex-col bg-[#1A1A1A] border-white/10 shadow-2xl shadow-black/50',
          'overscroll-contain overflow-y-auto',
          'top-0 right-0 h-dvh max-h-dvh w-[min(22rem,100vw)]',
          'rounded-none border-l',
          'pt-[max(0.75rem,env(safe-area-inset-top))]',
          'pb-[max(1rem,env(safe-area-inset-bottom))]',
          'pl-3 pr-[max(0.75rem,env(safe-area-inset-right))]',
          'md:top-16 md:right-6 md:h-auto md:max-h-[min(36rem,calc(100dvh-5.5rem))]',
          'md:w-[22rem] md:rounded-2xl md:border md:pt-3 md:pb-3 md:px-3',
          'max-md:animate-drawer-slide-in md:animate-admin-menu-in',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3 px-2 pb-3 mb-1 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <p
              id={titleId}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00FFFF]/90"
            >
              Admin menu
            </p>
            <p className="text-sm text-white/45 mt-0.5 truncate">LyricGrid controls</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-[#00FFFF]/40 hover:bg-white/5 transition-colors touch-manipulation shrink-0"
            aria-label="Close admin menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="flex flex-col gap-1 py-2" role="list">
          {ADMIN_NAV_LINKS.map(({ label, href, icon: Icon, match }) => {
            const active = isAdminNavActive(pathname, match, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3.5 py-3 min-h-12 rounded-xl text-base font-medium transition-colors touch-manipulation ${
                    active
                      ? 'bg-[#00FFFF]/12 text-[#00FFFF] border border-[#00FFFF]/25'
                      : 'text-white/75 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
