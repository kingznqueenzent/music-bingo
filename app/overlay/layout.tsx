import { OverlayTransparentRoot } from './OverlayTransparentRoot'

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <OverlayTransparentRoot>
      <div className="min-h-0 bg-transparent" style={{ background: 'transparent' }}>
        {children}
      </div>
    </OverlayTransparentRoot>
  )
}
