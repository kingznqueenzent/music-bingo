'use client'

import { useCallback, useState, type RefObject } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'
import { ADMIN_NAV_LINKS, isAdminNavActive } from '@/components/layout/admin-nav-links'
import { ResponsiveMenu } from '@/components/ui/menu/ResponsiveMenu'
import { ensureHostSession, isCookieProtectedPath } from '@/lib/ensure-host-session'
import { isPlayerFacingPath } from '@/lib/player-routes'

export type AdminNavDrawerProps = {
  open: boolean
  onClose: () => void
  /** Kept for API compatibility; admin menu uses a right-edge sheet. */
  anchorRef?: RefObject<HTMLElement | null>
}

/**
 * Clean right-edge Admin Menu — visual intent of the Layout mock,
 * with host-session minting and instant close (no exit flash).
 */
export function AdminNavDrawer({ open, onClose }: AdminNavDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [navigating, setNavigating] = useState(false)

  const playerMode = isPlayerFacingPath(pathname)

  const navigate = useCallback(
    async (href: string) => {
      if (navigating) return
      onClose()

      if (href === pathname || href === `${pathname}/`) {
        return
      }

      if (!isCookieProtectedPath(href)) {
        window.requestAnimationFrame(() => router.push(href))
        return
      }

      setNavigating(true)
      try {
        const { ok } = await ensureHostSession()
        if (!ok) {
          window.location.assign(`/login?from=${encodeURIComponent(href)}`)
          return
        }
        window.location.assign(href)
      } finally {
        setNavigating(false)
      }
    },
    [navigating, onClose, pathname, router]
  )

  if (playerMode) return null

  return (
    <ResponsiveMenu
      open={open}
      onClose={onClose}
      title="Admin Menu"
      description={navigating ? 'Opening…' : undefined}
      titleIcon={<Shield className="w-3.5 h-3.5 text-[#00FF66]" aria-hidden />}
      forceSheet
      sheetSide="right"
      footer={
        <p className="text-[11px] text-white/30 text-center">LyricGrid</p>
      }
    >
      <nav className="space-y-1.5 flex-1 py-1" aria-label="Admin destinations">
        {ADMIN_NAV_LINKS.map(({ label, href, icon: Icon, match }) => {
          const active = isAdminNavActive(pathname, match, href)
          return (
            <button
              key={href}
              type="button"
              disabled={navigating}
              onClick={() => void navigate(href)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 min-h-11 rounded-xl text-sm font-medium transition-colors touch-manipulation disabled:opacity-50 ${
                active
                  ? 'bg-[#00FF66]/10 text-[#00FF66]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </nav>
    </ResponsiveMenu>
  )
}
