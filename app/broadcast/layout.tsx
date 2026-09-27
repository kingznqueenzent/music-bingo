import type { Metadata } from 'next'
import { BroadcastRoot } from './BroadcastRoot'

export const metadata: Metadata = {
  title: 'KQ Music Bingo Broadcast',
  robots: { index: false, follow: false },
}

export default function BroadcastLayout({ children }: { children: React.ReactNode }) {
  return (
    <BroadcastRoot>
      <div className="broadcast-root">{children}</div>
    </BroadcastRoot>
  )
}
