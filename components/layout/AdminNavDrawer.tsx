'use client'

import { useEffect, useRef, type RefObject } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
 * Open/close is local UI state only (no auth revalidation).
 */
export function AdminNavDrawer({ open, onClose, anchorRef }: AdminNavDrawerProps) {
  const pathname = usePathname()
  const prevPathRef = useRef(pathname)

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
              <Link
                href={href}
                onClick={onClose}
                className={`${MENU_TOKENS.itemBaseClass} ${
                  active ? MENU_TOKENS.itemActiveClass : MENU_TOKENS.itemIdleClass
                }`}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </ResponsiveMenu>
  )
}
