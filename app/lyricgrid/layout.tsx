import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    absolute: 'LyricGrid – Music Bingo',
  },
  description: 'Interactive music bingo for livestreams and parties',
}

export default function LyricGridLayout({ children }: { children: React.ReactNode }) {
  return children
}
