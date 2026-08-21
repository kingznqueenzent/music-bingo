'use client'

import { Coffee, Crown } from 'lucide-react'
import { PATREON_URL, BUY_ME_A_COFFEE_URL, isIntegrationPlaceholder } from '@/lib/kingz/integrations'
import { KingzIntegrationLink, KingzCtaAction } from './KingzIntegrationLink'
import { KingzCtaStrip } from './KingzCtaStrip'
import { useKingzReveal } from './useKingzGsap'

/**
 * Support ecosystem — Buy Me a Coffee (live) + Become Royalty / Patreon (live).
 * No fake membership tiers, prices, or on-site recurring billing.
 */
export function KingzSupportDJs() {
  const ref = useKingzReveal<HTMLElement>()
  const patreonLive = !isIntegrationPlaceholder(PATREON_URL)

  return (
    <section id="support" ref={ref} className="kingz-section" aria-labelledby="support-heading">
      <div className="kingz-container">
        <div className="text-center mb-12" data-kingz-reveal>
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <p className="text-[#8b5cb8] text-xs uppercase tracking-[0.35em] mb-3">Support the Kingdom</p>
          <h2 id="support-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
            Become Royalty
          </h2>
          <p className="text-[#b0b0b0] mt-4 max-w-2xl mx-auto">
            Support DJ Merci &amp; DJ Liz — tip the next set today, or become royalty on Patreon.
          </p>
        </div>

        <div className="mb-14" data-kingz-reveal>
          <KingzCtaStrip
            headline="Support the Sound"
            subline="Buy Me a Coffee · Become Royalty"
            ctas={['Support Kingz & Queenz', 'Buy Us a Coffee', 'Become Royalty']}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-5xl mx-auto">
          <article data-kingz-reveal className="kingz-glass kingz-glass-hover p-8 flex flex-col">
            <Coffee className="h-8 w-8 text-[#D4AF37] mb-4" aria-hidden />
            <p className="text-[#8b5cb8] text-xs uppercase tracking-[0.25em] mb-2">One-time support</p>
            <h3 className="kingz-heading text-2xl text-[#D4AF37] mb-3">Buy Me a Coffee</h3>
            <p className="text-[#b0b0b0] text-sm leading-relaxed mb-8 flex-1">
              Fuel the next livestream, wedding set, or late-night mix. Tips go through Buy Me a Coffee —
              no account required on this site.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <KingzIntegrationLink
                href={BUY_ME_A_COFFEE_URL}
                label="Support Kingz & Queenz"
                variant="gold"
                className="uppercase tracking-[0.08em] text-sm"
                ariaLabel="Support Kingz and Queenz on Buy Me a Coffee (opens in new tab)"
              />
              <KingzIntegrationLink
                href={BUY_ME_A_COFFEE_URL}
                label="Buy Us a Coffee"
                variant="glass"
                className="text-sm"
                ariaLabel="Buy us a coffee on Buy Me a Coffee (opens in new tab)"
              />
            </div>
          </article>

          <article data-kingz-reveal className="kingz-glass kingz-glass-hover p-8 flex flex-col relative overflow-hidden">
            <Crown className="h-8 w-8 text-[#8b5cb8] mb-4" aria-hidden />
            <p className="text-[#8b5cb8] text-xs uppercase tracking-[0.25em] mb-2">Monthly membership</p>
            <h3 className="kingz-heading text-2xl text-[#D4AF37] mb-3">Become Royalty</h3>
            <p className="text-[#b0b0b0] text-sm leading-relaxed mb-4 flex-1">
              Monthly memberships for Kingz &amp; Queenz Entertainment are on Patreon.
              Memberships are not sold on this website.
            </p>
            {!patreonLive ? (
              <p className="text-[#D4AF37]/80 text-xs uppercase tracking-[0.2em] mb-6">Patreon — Coming Soon</p>
            ) : (
              <p className="text-[#b0b0b0] text-xs mb-6">Join on Patreon when you are ready.</p>
            )}
            <KingzIntegrationLink
              href={PATREON_URL}
              label="Become Royalty"
              variant="purple"
              className="uppercase tracking-[0.08em] text-sm w-full sm:w-auto"
              placeholderHint="Patreon Coming Soon — official URL pending"
              ariaLabel={
                patreonLive
                  ? 'Become Royalty on Patreon (opens in new tab)'
                  : 'Become Royalty — Patreon Coming Soon'
              }
            />
          </article>
        </div>

        <div className="flex flex-wrap justify-center gap-4" data-kingz-reveal>
          <KingzCtaAction
            label="Support Kingz & Queenz"
            href={BUY_ME_A_COFFEE_URL}
            variant="gold"
            external
            className="uppercase tracking-[0.08em] text-sm"
          />
          <KingzCtaAction
            label="Buy Us a Coffee"
            href={BUY_ME_A_COFFEE_URL}
            variant="glass"
            external
            className="text-sm"
          />
          <KingzCtaAction
            label="Become Royalty"
            href={PATREON_URL}
            variant="purple"
            external
            className="uppercase tracking-[0.08em] text-sm"
          />
        </div>
      </div>
    </section>
  )
}
