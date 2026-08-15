import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Play',
  description: 'Your LyricGrid music bingo card — mark songs as they play.',
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children
}
