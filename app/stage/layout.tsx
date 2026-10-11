import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Stage — LyricGrid',
  description: 'OBS overlay and venue stage views for live Music Bingo broadcasts.',
  robots: { index: false, follow: false },
}

export default function StageLayout({ children }: { children: React.ReactNode }) {
  return children
}
