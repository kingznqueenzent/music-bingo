'use client'

import { useCallback, type RefObject } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ADMIN_NAV_LINKS, isAdminNavActive } from '@/components/layout/admin-nav-links'
import { ResponsiveMenu } from '@/components/ui/menu/ResponsiveMenu'
import { MENU_TOKENS } from '@/components/ui/menu/tokens'

export type AdminNavDrawerProps = {
  open: boolean
  onClose: () => void
  /** Desktop Floating UI anchor (Admin button). */
  anchorRef?: RefObject<HTMLElement | null>
}

/**
 * Admin navigation — mobile bottom sheet / desktop anchored popover.
 * Closes and unmounts *before* client navigation to avoid Media Manager flash.
 */
export function AdminNavDrawer({ open, onClose, anchorRef }: AdminNavDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navigate = useCallback(
    (href: string) => {
      // 1) Close + purge portal synchronously
      onClose()
      // 2) Navigate on next frame so the sheet is gone before the route paints
      window.requestAnimationFrame(() => {
        if (href === pathname) return
        router.push(href)
      })
    },
    [onClose, pathname, router]
  )

  return (
    <ResponsiveMenu
      open={open}
      onClose={onClose}
      title="Admin menu"
      description="LyricGrid controls"
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
                onClick={() => navigate(href)}
                className={`${MENU_TOKENS.itemBaseClass} ${
                  active ? MENU_TOKENS.itemActiveClass : MENU_TOKENS.itemIdleClass
                }`}
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
