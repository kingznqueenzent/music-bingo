'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { AdminNavDrawer } from '@/components/layout/AdminNavDrawer'
import { isPlayerFacingPath } from '@/lib/player-routes'

export type StaffHeaderActionsProps = {
  /** Post-login redirect target passed to /login */
  loginFrom?: string
  loginClassName?: string
  menuButtonClassName?: string
  /** Show “Admin” label beside the icon on larger breakpoints (default true). */
  showAdminLabel?: boolean
}

const DEFAULT_MENU_BUTTON =
  'inline-flex items-center justify-center gap-2 min-h-12 min-w-12 md:min-w-0 md:h-12 md:px-4 rounded-xl border border-white/15 bg-white/5 text-white/80 hover:text-[#00FF66] hover:border-[#00FF66]/40 hover:bg-[#00FF66]/5 active:bg-[#00FF66]/10 transition-colors touch-manipulation shadow-sm'

export function StaffHeaderActions({
  loginFrom = '/host',
  loginClassName = 'text-sm text-white/50 hover:text-[#00FF66]/90 transition-colors whitespace-nowrap min-h-12 inline-flex items-center px-2',
  menuButtonClassName = DEFAULT_MENU_BUTTON,
  showAdminLabel = true,
}: StaffHeaderActionsProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { isAdmin, loading, ready } = useIsAdmin()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const playerMode = isPlayerFacingPath(pathname)

  const showAdminControls = isAdmin && !playerMode
  const showHostLogin = ready && !loading && !isAdmin && !playerMode

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // Close synchronously before paint on every client navigation (Media Manager, Host, etc.).
  useLayoutEffect(() => {
    setOpen(false)
  }, [pathname])

  // bfcache restore can revive open menu state — force closed.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setOpen(false)
    }
    const onPageHide = () => setOpen(false)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  useEffect(() => {
    if (!showAdminControls && open) handleClose()
  }, [showAdminControls, open, handleClose])

  if (playerMode) return null

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {showHostLogin ? (
          <Link
            href={`/login?from=${encodeURIComponent(loginFrom)}`}
            className={loginClassName}
          >
            Host Portal
          </Link>
        ) : null}
        {showAdminControls ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={menuButtonClassName}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={open ? 'Close admin menu' : 'Open admin menu'}
          >
            {open ? <X className="h-5 w-5 shrink-0" /> : <Menu className="h-5 w-5 shrink-0" />}
            {showAdminLabel ? (
              <span className="hidden sm:inline text-sm font-semibold tracking-wide">Admin</span>
            ) : null}
          </button>
        ) : null}
      </div>
      {showAdminControls ? (
        <AdminNavDrawer open={open} onClose={handleClose} anchorRef={triggerRef} />
      ) : null}
    </>
  )
}
