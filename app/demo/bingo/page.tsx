import type { Metadata } from 'next'
import { BingoDemoClient } from './BingoDemoClient'

export const metadata: Metadata = {
  title: {
    absolute: 'Bingo Card Demo | LyricGrid',
  },
  description: 'Interactive sandbox for testing LyricGrid bingo card tiles, animations, and haptics.',
  robots: { index: false, follow: false },
}

export default function BingoDemoPage() {
  return <BingoDemoClient />
}
