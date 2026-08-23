import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import { KingzOverlayRoot } from './KingzOverlayRoot'
import '@/styles/kingz-overlay.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Kingz Overlay',
  robots: { index: false, follow: false },
}

export default function KingzOverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <KingzOverlayRoot>
      <div className={`${montserrat.variable} ${montserrat.className}`}>{children}</div>
    </KingzOverlayRoot>
  )
}
