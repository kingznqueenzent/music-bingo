'use client'

import { buildPlatformCtas } from '@/lib/kingz/merch'
import { KingzCtaAction } from './KingzIntegrationLink'

type KingzCtaStripProps = {
  headline?: string
  subline?: string
  className?: string
  /** Subset of CTA labels to show; defaults to all */
  ctas?: string[]
}

export function KingzCtaStrip({
  headline = 'Wear the Crown. Support the Sound.',
  subline = 'Merch drops, memberships, and one-click support — all in one royal ecosystem.',
  className = '',
  ctas,
}: KingzCtaStripProps) {
  const allCtas = buildPlatformCtas()
  const visible = ctas ? allCtas.filter((c) => ctas.includes(c.label)) : allCtas

  return (
    <div
      className={`kingz-cta-banner kingz-glass rounded-2xl p-6 md:p-10 text-center ${className}`}
      role="region"
      aria-label="Call to action"
    >
      <p className="text-[#8b5cb8] text-xs uppercase tracking-[0.35em] mb-3 font-medium">{subline}</p>
      <h3 className="kingz-heading text-2xl md:text-3xl kingz-gold-gradient font-bold mb-8">{headline}</h3>
      <div className="flex flex-wrap justify-center gap-3 md:gap-4">
        {visible.map((cta) => (
          <KingzCtaAction key={cta.label} {...cta} className="text-sm md:text-base" />
        ))}
      </div>
    </div>
  )
}
