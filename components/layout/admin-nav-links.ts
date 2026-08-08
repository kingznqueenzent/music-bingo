import type { LucideIcon } from 'lucide-react'
import {
  Grid3x3,
  Music2,
  LayoutDashboard,
  Library,
  Tv2,
  Trophy,
  Settings,
  Map,
  LayoutGrid,
} from 'lucide-react'

export type AdminNavLink = {
  label: string
  href: string
  icon: LucideIcon
  match: string
}

/** Eight core admin destinations for the hamburger drawer. */
export const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { label: 'Home', href: '/', icon: Grid3x3, match: '/' },
  { label: 'Host', href: '/host', icon: LayoutDashboard, match: '/host' },
  { label: 'Media Manager', href: '/media-manager', icon: Library, match: '/media' },
  { label: 'Browse Themes', href: '/themes', icon: LayoutGrid, match: '/themes' },
  { label: 'Stage', href: '/stage', icon: Tv2, match: '/stage' },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy, match: '/leaderboard' },
  { label: 'KingzControl', href: '/kingz-control', icon: Settings, match: '/kingz-control' },
  { label: 'Sitemap', href: '/sitemap', icon: Map, match: '/sitemap' },
  { label: 'Playlists', href: '/playlists', icon: Music2, match: '/playlists' },
]

export function isAdminNavActive(pathname: string, match: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '/lyricgrid'
  if (match === '/host') {
    return pathname === '/host' || pathname.startsWith('/host/')
  }
  if (match === '/media') {
    return pathname === '/media' || pathname.startsWith('/media') || pathname === '/media-manager'
  }
  return pathname === match || pathname.startsWith(`${match}/`)
}
