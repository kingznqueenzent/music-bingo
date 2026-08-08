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
  Gamepad2,
  Users,
  BarChart3,
  Flag,
  MessagesSquare,
  Package,
  Mic2,
  SlidersHorizontal,
} from 'lucide-react'

export type SitemapPageEntry = {
  href: string
  label: string
  description: string
  icon: LucideIcon
  section: 'Core' | 'Host' | 'Player' | 'Admin' | 'Marketing'
}

export const SITEMAP_PAGES: SitemapPageEntry[] = [
  {
    href: '/',
    label: 'Home',
    description: 'Kingz & Queenz Entertainment landing (DJ services). Official alias: /Home → /lyricgrid.',
    icon: Grid3x3,
    section: 'Core',
  },
  {
    href: '/lyricgrid',
    label: 'LyricGrid Home',
    description: 'Music bingo product home — join, host, and play. Official URL: /Home.',
    icon: Gamepad2,
    section: 'Core',
  },
  {
    href: '/join',
    label: 'Join Game',
    description: 'Enter a room code to join a live bingo session.',
    icon: Users,
    section: 'Player',
  },
  {
    href: '/play',
    label: 'Play / Join with Code',
    description: 'Join or open the interactive bingo card. Official URL: /Play.',
    icon: Gamepad2,
    section: 'Player',
  },
  {
    href: '/playlists',
    label: 'Playlists / Music Themes',
    description: 'Browse Country, Rock, Billboard and other themes. Official URL: /Playlists.',
    icon: Music2,
    section: 'Host',
  },
  {
    href: '/host',
    label: 'Host Dashboard',
    description: 'Create games, call songs, verify wins, and control the room. Official URL: /HostDashboard.',
    icon: LayoutDashboard,
    section: 'Host',
  },
  {
    href: '/host/create-from-media',
    label: 'Create from Song Catalog',
    description: 'Build a game from the full public.songs library (paginated catalog fetch).',
    icon: Library,
    section: 'Host',
  },
  {
    href: '/host/analytics',
    label: 'Host Analytics',
    description: 'Session stats and returning player insights.',
    icon: BarChart3,
    section: 'Host',
  },
  {
    href: '/media-manager',
    label: 'Media Manager',
    description: 'Full public.songs catalog — search, theme pills (Country/Rock/Billboard), upload. Official URL: /MediaManager.',
    icon: Library,
    section: 'Host',
  },
  {
    href: '/media',
    label: 'Bingo Track Library',
    description: 'Legacy bingo_game_tracks + media_library sync tools (uploads mirror into songs).',
    icon: Library,
    section: 'Host',
  },
  {
    href: '/stage',
    label: 'Stage Broadcast',
    description: 'Venue TV view — now playing, join code, winner overlays. Supports ?game=GAME_ID. Official URL: /Stage.',
    icon: Tv2,
    section: 'Host',
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    description: 'Wins, XP, and seasonal rankings. Official URL: /Leaderboard.',
    icon: Trophy,
    section: 'Player',
  },
  {
    href: '/profile',
    label: 'Player Profile',
    description: 'XP level, badges, and premium status. Official URL: /PlayerProfile.',
    icon: Users,
    section: 'Player',
  },
  {
    href: '/community',
    label: 'Community Hub',
    description: 'Always-on chat rooms between games.',
    icon: MessagesSquare,
    section: 'Player',
  },
  {
    href: '/tournaments',
    label: 'Tournaments',
    description: 'Seasonal tournament lobbies and leaderboards.',
    icon: Trophy,
    section: 'Player',
  },
  {
    href: '/kingz-control',
    label: 'KingzControl',
    description: 'Internal controls for Kingz & Queenz site content and integrations. Official URL: /KingzControl.',
    icon: Settings,
    section: 'Admin',
  },
  {
    href: '/kingz',
    label: 'Kingz Site',
    description: 'Public DJ marketing site (also served at / on main domain).',
    icon: Mic2,
    section: 'Marketing',
  },
  {
    href: '/venue-packages',
    label: 'Venue Packages',
    description: 'B2B pricing tiers for venues and event planners.',
    icon: Package,
    section: 'Marketing',
  },
  {
    href: '/analyze-mix',
    label: 'Mix Analyzer',
    description: 'Upload DJ mixes for copyright / track ID analysis.',
    icon: SlidersHorizontal,
    section: 'Admin',
  },
  {
    href: '/host/feature-flags',
    label: 'Feature Flags',
    description: 'Toggle LyricGrid feature modules per deployment.',
    icon: Flag,
    section: 'Admin',
  },
  {
    href: '/sitemap',
    label: 'Sitemap (this page)',
    description: 'Admin-only directory of all application routes.',
    icon: Map,
    section: 'Admin',
  },
  {
    href: '/admin-login',
    label: 'Admin Login',
    description: 'Authenticate for host, media, and sitemap access.',
    icon: Settings,
    section: 'Admin',
  },
]

export function formatSitemapSpec(origin: string, generatedAt = new Date()): string {
  const sections = ['Core', 'Host', 'Player', 'Admin', 'Marketing'] as const
  const lines: string[] = [
    'LyricGrid Application Sitemap',
    '================================',
    '',
    `Generated: ${generatedAt.toLocaleString()}`,
    `Base URL: ${origin}`,
    '',
  ]

  for (const section of sections) {
    const pages = SITEMAP_PAGES.filter((p) => p.section === section)
    if (pages.length === 0) continue
    lines.push(section.toUpperCase())
    lines.push('-'.repeat(section.length))
    lines.push('')
    for (const page of pages) {
      const url = `${origin.replace(/\/$/, '')}${page.href}`
      lines.push(`${page.label}`)
      lines.push(`  URL: ${url}`)
      lines.push(`  ${page.description}`)
      lines.push('')
    }
  }

  lines.push('— End of spec —')
  return lines.join('\n')
}

export function formatSitemapMarkdown(origin: string, generatedAt = new Date()): string {
  const sections = ['Core', 'Host', 'Player', 'Admin', 'Marketing'] as const
  const lines: string[] = [
    '# LyricGrid Sitemap',
    '',
    `_Generated ${generatedAt.toLocaleString()}_`,
    '',
    `**Base URL:** ${origin}`,
    '',
  ]

  for (const section of sections) {
    const pages = SITEMAP_PAGES.filter((p) => p.section === section)
    if (pages.length === 0) continue
    lines.push(`## ${section}`)
    lines.push('')
    for (const page of pages) {
      const url = `${origin.replace(/\/$/, '')}${page.href}`
      lines.push(`### ${page.label}`)
      lines.push('')
      lines.push(page.description)
      lines.push('')
      lines.push(`**URL:** [${url}](${url})`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
