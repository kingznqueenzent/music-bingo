'use client'

import { useCallback, useState, type RefObject } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ADMIN_NAV_LINKS, isAdminNavActive } from '@/components/layout/admin-nav-links'
import { ResponsiveMenu } from '@/components/ui/menu/ResponsiveMenu'
import { MENU_TOKENS } from '@/components/ui/menu/tokens'
import { ensureHostSession, isCookieProtectedPath } from '@/lib/ensure-host-session'

export type AdminNavDrawerProps = {
  open: boolean
  onClose: () => void
  /** Desktop Floating UI anchor (Admin button). */
  anchorRef?: RefObject<HTMLElement | null>
}

/**
 * Admin navigation — mobile bottom sheet / desktop anchored popover.
 * For Media Manager / Host etc., mint admin_verified before navigating so
 * proxy + layout never bounce through /login.
 */
export function AdminNavDrawer({ open, onClose, anchorRef }: AdminNavDrawerProps) {
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

      // Public-ish destinations can soft-navigate.
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
        // Hard navigation so the just-set cookie is always on the next document request.
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
      title="Admin menu"
      description={navigating ? 'Opening…' : 'LyricGrid controls'}
      anchorRef={anchorRef}
      placement="bottom-end"
      desktopWidthClass="w-[22rem]"
    >
      <ul className="flex flex-col gap-1" role="list">
        {ADMIN_NAV_LINKS.map(({ label, href, icon: Icon, match }) => {
          const active = isAdminNavActive(pathname, match, href)
          return (
            <li key={href}>
              <button
                type="button"
                disabled={navigating}
                onClick={() => void navigate(href)}
                className={`${MENU_TOKENS.itemBaseClass} ${
                  active ? MENU_TOKENS.itemActiveClass : MENU_TOKENS.itemIdleClass
                } disabled:opacity-50`}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </ResponsiveMenu>
  )
}
