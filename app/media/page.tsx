import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ theme?: string }> }

/** Legacy route — forward to Media Manager with theme filter preserved. */
export default async function MediaPage({ searchParams }: Props) {
  const { theme } = await searchParams
  if (theme?.trim()) {
    redirect(`/media-manager?theme=${encodeURIComponent(theme.trim())}`)
  }
  redirect('/media-manager')
}
