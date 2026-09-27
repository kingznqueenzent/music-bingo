import { notFound } from 'next/navigation'
import { BroadcastLeaderboardView } from '@/components/broadcast/BroadcastLeaderboardView'
import { isBroadcastSlug } from '@/lib/broadcast/slugs'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'KQ Music Bingo Leaderboard',
  robots: { index: false, follow: false },
}

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function BroadcastLeaderboardPage({ params }: PageProps) {
  const { slug } = await params
  if (!isBroadcastSlug(slug)) notFound()
  return <BroadcastLeaderboardView slug={slug} />
}
