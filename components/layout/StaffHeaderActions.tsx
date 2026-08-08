'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { AdminNavDrawer } from '@/components/layout/AdminNavDrawer'

export type StaffHeaderActionsProps = {
  /** Post-login redirect target passed to /login */
  loginFrom?: string
  loginClassName?: string
  menuButtonClassName?: string
  /** Show “Admin” label beside the icon on larger breakpoints (default true). */
  showAdminLabel?: boolean
}

const DEFAULT_MENU_BUTTON =
  'inline-flex items-center justify-center gap-2 min-h-11 min-w-11 md:min-w-0 md:h-11 md:px-3.5 rounded-xl border border-white/15 bg-white/5 text-white/80 hover:text-[#00FFFF] hover:border-[#00FFFF]/40 hover:bg-[#00FFFF]/5 transition-colors touch-manipulation shadow-sm'

export function StaffHeaderActions({
  loginFrom = '/host',
  loginClassName = 'text-sm text-white/50 hover:text-[#00FFFF]/90 transition-colors whitespace-nowrap min-h-11 inline-flex items-center px-1',
  menuButtonClassName = DEFAULT_MENU_BUTTON,
  showAdminLabel = true,
}: StaffHeaderActionsProps) {
  const [open, setOpen] = useState(false)
  const { isAdmin, loading } = useIsAdmin()

  const handleClose = useCallback(() => setOpen(false), [])

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {!loading && !isAdmin && (
          <Link
            href={`/login?from=${encodeURIComponent(loginFrom)}`}
            className={loginClassName}
          >
            Host Portal
          </Link>
        )}
        {isAdmin && (
          <button
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
        )}
      </div>
      {isAdmin && <AdminNavDrawer open={open} onClose={handleClose} />}
    </>
  )
}
