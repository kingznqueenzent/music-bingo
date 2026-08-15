import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join Game',
  description: 'Enter a game code and get your LyricGrid music bingo card.',
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children
}
