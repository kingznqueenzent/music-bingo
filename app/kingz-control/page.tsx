import Link from 'next/link'
import { KingzSponsorTeaser } from './KingzSponsorTeaser'
import { requireAdminSession } from '@/lib/admin-guard-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'KingzControl — LyricGrid',
  description: 'Master system management for LyricGrid hosts',
}

const links = [
  { href: '/lyricgrid', label: 'LyricGrid home' },
  { href: '/host', label: 'Host dashboard' },
  { href: '/media-manager', label: 'Media Manager' },
  { href: '/playlists', label: 'Playlists & themes' },
  { href: '/stage', label: 'Stage broadcast' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/sitemap', label: 'Sitemap' },
  { href: '/login', label: 'Host Portal login' },
]

export default async function KingzControlPage() {
  await requireAdminSession('/kingz-control')

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-10 max-w-xl mx-auto bg-[#121212]">
      <p className="text-xs uppercase tracking-[0.25em] text-[#FFD700]/80 mb-2">System</p>
      <h1 className="text-3xl font-black text-[#00FFFF] mb-1">KingzControl</h1>
      <p className="text-slate-400 text-sm mb-8">Master shortcuts for hosts and venue admins.</p>
      <KingzSponsorTeaser />
      <ul className="space-y-2">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-xl border border-[#00FFFF]/15 bg-[#1E1E1E] px-4 py-3 text-sm text-slate-200 hover:border-[#00FFFF]/40 hover:text-[#00FFFF] transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
