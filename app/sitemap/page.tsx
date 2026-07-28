import Link from 'next/link'

export const metadata = {
  title: 'Sitemap — LyricGrid',
}

const pages: { href: string; label: string }[] = [
  { href: '/', label: 'Kingz & Queenz Entertainment (DJ website)' },
  { href: '/lyricgrid', label: 'LyricGrid (music bingo home)' },
  { href: '/join', label: 'Join a game' },
  { href: '/play', label: 'Player card' },
  { href: '/playlists', label: 'Playlists' },
  { href: '/host', label: 'Host' },
  { href: '/media', label: 'Media Manager' },
  { href: '/stage', label: 'Stage' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/kingz-control', label: 'KingzControl' },
  { href: '/admin-login', label: 'Admin login' },
]

export default function SitemapPage() {
  return (
    <main className="min-h-[calc(100vh-3rem)] px-6 py-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Sitemap</h1>
      <ul className="space-y-2">
        {pages.map(({ href, label }) => (
          <li key={`${href}-${label}`}>
            <Link href={href} className="text-brand-neon hover:underline text-sm">
              {label}
            </Link>
            <span className="text-white/30 text-xs ml-2 font-mono">{href}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
