import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Short venue URL → Join with code pre-filled (`lyricgrid.ca/room/CODE`). */
export default async function RoomRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const trimmed = (code ?? '').trim()
  if (!trimmed) redirect('/join')
  redirect(`/join?code=${encodeURIComponent(trimmed)}`)
}
