'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { AdminNavDrawer } from '@/components/layout/AdminNavDrawer'

export type StaffHeaderActionsProps = {
  /** Post-login redirect target passed to /login */
  loginFrom?: string
  loginClassName?: string
  menuButtonClassName?: string
}

export function StaffHeaderActions({
  loginFrom = '/host',
  loginClassName = 'text-xs text-white/45 hover:text-[#00FFFF]/85 transition-colors whitespace-nowrap',
  menuButtonClassName = 'h-9 w-9 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-[#00FFFF] hover:border-[#00FFFF]/30 transition-colors touch-manipulation',
}: StaffHeaderActionsProps) {
  const [open, setOpen] = useState(false)
  const { isAdmin, loading } = useIsAdmin()

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
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
            aria-label={open ? 'Close admin menu' : 'Open admin menu'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
      </div>
      {isAdmin && <AdminNavDrawer open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
