import { Montserrat } from 'next/font/google'
import { OverlayTransparentRoot } from './OverlayTransparentRoot'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-montserrat',
  display: 'swap',
})

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <OverlayTransparentRoot>
      <div
        className={`${montserrat.variable} ${montserrat.className} overlay-canvas min-h-0 bg-transparent`}
        style={{ background: 'transparent' }}
      >
        {children}
      </div>
    </OverlayTransparentRoot>
  )
}
