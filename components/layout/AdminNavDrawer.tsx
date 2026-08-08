'use client'

import { useCallback, useState, type RefObject } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Shield } from 'lucide-react'
import { ADMIN_NAV_LINKS, isAdminNavActive } from '@/components/layout/admin-nav-links'
import { ResponsiveMenu } from '@/components/ui/menu/ResponsiveMenu'
import { MENU_TOKENS } from '@/components/ui/menu/tokens'
import { ensureHostSession, isCookieProtectedPath } from '@/lib/ensure-host-session'

export type AdminNavDrawerProps = {
  open: boolean
  onClose: () => void
  /** Kept for API compatibility; admin menu uses a right-edge sheet. */
  anchorRef?: RefObject<HTMLElement | null>
}

/**
 * Admin navigation — clean right-edge drawer on all viewports.
 * Mints admin_verified before navigating to cookie-protected routes.
 */
export function AdminNavDrawer({ open, onClose }: AdminNavDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [navigating, setNavigating] = useState(false)

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

  return (
    <ResponsiveMenu
      open={open}
      onClose={onClose}
      title="Admin Menu"
      description={navigating ? 'Opening…' : 'Host · Media · Stage'}
      titleIcon={<Shield className="w-3.5 h-3.5" aria-hidden />}
      forceSheet
      sheetSide="right"
      footer={
        <p className="text-[11px] text-white/30 text-center tracking-wide">
          Kingz &amp; Queenz Ent.
        </p>
      }
    >
      <nav className="flex flex-col gap-1 py-1" aria-label="Admin destinations">
        {ADMIN_NAV_LINKS.map(({ label, href, icon: Icon, match }) => {
          const active = isAdminNavActive(pathname, match, href)
          return (
            <button
              key={href}
              type="button"
              disabled={navigating}
              onClick={() => void navigate(href)}
              className={`${MENU_TOKENS.itemBaseClass} justify-between ${
                active ? MENU_TOKENS.itemActiveClass : MENU_TOKENS.itemIdleClass
              } disabled:opacity-50`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="truncate text-sm font-medium">{label}</span>
              </span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 ${active ? 'text-[#00FFFF]/80' : 'text-white/25'}`}
                aria-hidden
              />
            </button>
          )
        })}
      </nav>
    </ResponsiveMenu>
  )
}
