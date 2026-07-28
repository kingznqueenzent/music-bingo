'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
  Grid3x3,
  Music2,
  Tv2,
  Users,
  Settings,
  Library,
  LayoutDashboard,
  UserCircle,
  Trophy,
  Flag,
  BarChart3,
  Package,
  MessagesSquare,
} from 'lucide-react'
import type { FeatureFlagKey } from '@/lib/feature-flag-keys'
import { useFeatureFlags } from '@/components/FeatureFlagsProvider'

const navLinks: {
  label: string
  href: string
  icon: typeof Grid3x3
  /** Match this path prefix for active state */
  match?: string
  /** When set, link is hidden unless flag is enabled (after flags load). */
  flag?: FeatureFlagKey
}[] = [
  { label: 'Home', href: '/lyricgrid', icon: Grid3x3, match: '/lyricgrid' },
  { label: 'Playlists', href: '/playlists', icon: Music2, match: '/playlists' },
  { label: 'Host Dashboard', href: '/host', icon: LayoutDashboard, match: '/host' },
  { label: 'Host analytics', href: '/host/analytics', icon: BarChart3, match: '/host/analytics', flag: 'host_analytics' },
  { label: 'Venue packages', href: '/venue-packages', icon: Package, match: '/venue-packages', flag: 'venue_packages' },
  { label: 'Community', href: '/community', icon: MessagesSquare, match: '/community', flag: 'community_chat' },
  { label: 'Media Manager', href: '/media', icon: Library, match: '/media' },
  { label: 'Stage', href: '/stage', icon: Tv2, match: '/stage' },
  { label: 'Leaderboard', href: '/leaderboard', icon: Users, match: '/leaderboard', flag: 'xp_and_badges' },
  { label: 'Tournaments', href: '/tournaments', icon: Trophy, match: '/tournaments', flag: 'tournaments' },
  { label: 'Profile', href: '/profile', icon: UserCircle, match: '/profile', flag: 'xp_and_badges' },
  { label: 'Feature flags', href: '/host/feature-flags', icon: Flag, match: '/host/feature-flags' },
  { label: 'KingzControl', href: '/kingz-control', icon: Settings, match: '/kingz-control' },
  { label: 'Sitemap', href: '/sitemap', icon: Grid3x3, match: '/sitemap' },
]

function isActive(pathname: string, match: string): boolean {
  if (match === '/lyricgrid') return pathname === '/lyricgrid'
  return pathname === match || pathname.startsWith(`${match}/`)
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()
  const { isEnabled, loading: flagsLoading } = useFeatureFlags()

  const showNavItem = (flag: FeatureFlagKey | undefined) => {
    if (!flag) return true
    if (flagsLoading) return false
    return isEnabled(flag)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin-session')
      .then((r) => r.json())
      .then((data: { isAdmin?: boolean }) => {
        if (!cancelled && data?.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 h-12 bg-brand-dark/90 border-b border-white/5 backdrop-blur-sm pointer-events-auto">
        <Link
          href="/lyricgrid"
          className="text-brand-neon font-black text-sm tracking-wider hover:opacity-90 transition-opacity touch-manipulation pointer-events-auto"
        >
          LyricGrid
        </Link>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            onTouchStart={(e) => e.stopPropagation()}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-brand-neon hover:border-brand-neon/30 transition-colors touch-manipulation pointer-events-auto"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        )}
      </div>

      {open && isAdmin && (
        <div
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="absolute top-12 right-0 bottom-0 z-[9999] w-56 max-w-[85vw] bg-brand-surface border-l border-white/10 p-3 space-y-1 overflow-y-auto pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Navigation menu"
          >
            {navLinks.map(({ label, href, icon: Icon, match, flag }) => {
              if (href.startsWith('/host/feature-flags') && !isAdmin) return null
              if (!showNavItem(flag)) return null
              const active = match ? isActive(pathname, match) : pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`touch-manipulation pointer-events-auto flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-neon/10 text-brand-neon'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="pt-12">{children}</div>
    </div>
  )
}
