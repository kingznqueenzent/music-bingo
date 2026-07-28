import Link from 'next/link'
import { KingzSponsorTeaser } from './KingzSponsorTeaser'

export const metadata = {
  title: 'KingzControl — LyricGrid',
  description: 'Admin shortcuts',
}

const links = [
  { href: '/', label: '★ Kingz & Queenz DJ website (home)' },
  { href: '/lyricgrid', label: 'LyricGrid — music bingo app' },
  { href: '/host', label: 'Host — create & run games' },
  { href: '/media', label: 'Media Manager' },
  { href: '/playlists', label: 'Playlists / themes' },
  { href: '/stage', label: 'Stage (enter game ID)' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/admin-login', label: 'Admin login' },
  { href: '/join', label: 'Join a game' },
]

export default function KingzControlPage() {
  return (
    <main className="min-h-[calc(100vh-3rem)] px-6 py-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">KingzControl</h1>
      <p className="text-white/50 text-sm mb-8">Quick links for hosts and admins.</p>
      <KingzSponsorTeaser />
      <ul className="space-y-2">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:border-brand-neon/30 hover:text-brand-neon transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
