import { notFound } from 'next/navigation'
import { BroadcastView } from '@/components/broadcast/BroadcastView'
import { isBroadcastSlug } from '@/lib/broadcast/slugs'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function BroadcastSlugPage({ params }: PageProps) {
  const { slug } = await params
  if (!isBroadcastSlug(slug)) notFound()
  return <BroadcastView slug={slug} />
}
