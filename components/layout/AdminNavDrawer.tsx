'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ADMIN_NAV_LINKS, isAdminNavActive } from '@/components/layout/admin-nav-links'

export type AdminNavDrawerProps = {
  open: boolean
  onClose: () => void
}

export function AdminNavDrawer({ open, onClose }: AdminNavDrawerProps) {
  const pathname = usePathname()

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <nav
        className="absolute top-0 right-0 h-full w-56 max-w-[85vw] bg-[#1E1E1E] border-l border-white/10 p-4 pt-14 space-y-1 overflow-y-auto shadow-2xl animate-drawer-slide-in"
        onClick={(e) => e.stopPropagation()}
        aria-label="Admin navigation"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 px-3 mb-2">Admin</p>
        {ADMIN_NAV_LINKS.map(({ label, href, icon: Icon, match }) => {
          const active = isAdminNavActive(pathname, match, href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                active
                  ? 'bg-[#00FFFF]/10 text-[#00FFFF]'
                  : 'text-white/55 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
