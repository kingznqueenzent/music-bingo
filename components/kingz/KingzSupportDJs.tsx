'use client'

import Image from 'next/image'
import { Crown, Music, Video, Ticket, Megaphone } from 'lucide-react'
import { SUPPORT_TIERS, DJ_MERCH_COLLECTIONS } from '@/lib/kingz/merch'
import { PATREON_URL, BUY_ME_A_COFFEE_URL } from '@/lib/kingz/integrations'
import { KingzIntegrationLink, KingzCtaAction } from './KingzIntegrationLink'
import { KingzCtaStrip } from './KingzCtaStrip'
import { useKingzReveal } from './useKingzGsap'

const PERK_ICONS = [Music, Video, Ticket, Megaphone, Crown]

export function KingzSupportDJs() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section id="support" ref={ref} className="kingz-section" aria-labelledby="support-heading">
      <div className="kingz-container">
        <div className="text-center mb-12" data-kingz-reveal>
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <h2 id="support-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
            Support the DJs
          </h2>
          <p className="text-[#b0b0b0] mt-4 max-w-2xl mx-auto">
            Fuel the next set. Monthly memberships, exclusive mixes, behind-the-scenes access, and VIP shoutouts.
          </p>
        </div>

        <div className="mb-14" data-kingz-reveal>
          <KingzCtaStrip
            headline="Become a Royal Supporter"
            subline="One-time tips or monthly memberships"
            ctas={['Buy Us a Coffee', 'Join Patreon', 'Support Us']}
          />
        </div>

        {/* DJ-specific support cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {DJ_MERCH_COLLECTIONS.map((col) => (
            <article key={col.slug} data-kingz-reveal className="kingz-glass kingz-glass-hover overflow-hidden">
              <div className="relative h-48">
                <Image src={col.image} alt={col.dj} fill sizes="50vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
                <div className="absolute bottom-4 left-5">
                  <h3 className="kingz-heading text-2xl text-[#D4AF37]">Support {col.dj}</h3>
                  <p className="text-[#d4d4d4] text-sm">{col.tagline}</p>
                </div>
              </div>
              <div className="p-6">
                <ul className="text-[#b0b0b0] text-sm space-y-2 mb-6">
                  <li className="flex items-center gap-2"><Music className="h-4 w-4 text-[#8b5cb8]" aria-hidden /> Exclusive mixes</li>
                  <li className="flex items-center gap-2"><Video className="h-4 w-4 text-[#8b5cb8]" aria-hidden /> Behind-the-scenes content</li>
                  <li className="flex items-center gap-2"><Ticket className="h-4 w-4 text-[#8b5cb8]" aria-hidden /> Early event access</li>
                  <li className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-[#8b5cb8]" aria-hidden /> VIP shoutouts</li>
                </ul>
                <div className="flex flex-wrap gap-3">
                  {/*
                    INTEGRATION: DJ support links
                    - Patreon tier → PATREON_URL in lib/kingz/integrations.ts
                    - Per-DJ Stripe → STRIPE_LINKS.supportDjLiz / supportDjMerci
                  */}
                  <KingzIntegrationLink
                    href={col.slug === 'liz' ? SUPPORT_TIERS.find((t) => t.dj === 'liz')?.storeUrl ?? PATREON_URL : SUPPORT_TIERS.find((t) => t.dj === 'merci')?.storeUrl ?? PATREON_URL}
                    label={`Support ${col.dj}`}
                    variant="purple"
                  />
                  <KingzIntegrationLink href={col.storeUrl} label={`${col.dj} Merch`} variant="outline" />
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Membership tiers */}
        <h3 className="kingz-heading text-xl text-center text-[#f5f5f5] mb-8" data-kingz-reveal>
          Monthly Supporter Memberships
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SUPPORT_TIERS.map((tier, i) => (
            <article key={tier.id} data-kingz-reveal className="kingz-glass kingz-glass-hover p-6 flex flex-col">
              <Crown className="h-6 w-6 text-[#D4AF37] mb-3" aria-hidden />
              <h4 className="kingz-heading text-lg text-[#f5f5f5] mb-1">{tier.name}</h4>
              <p className="text-[#D4AF37] font-bold text-xl mb-4">{tier.priceLabel}</p>
              <ul className="text-[#b0b0b0] text-sm space-y-2 flex-1 mb-6">
                {tier.perks.map((perk, j) => {
                  const Icon = PERK_ICONS[j % PERK_ICONS.length]
                  return (
                    <li key={perk} className="flex items-start gap-2">
                      <Icon className="h-4 w-4 text-[#8b5cb8] shrink-0 mt-0.5" aria-hidden />
                      {perk}
                    </li>
                  )
                })}
              </ul>
              {/*
                INTEGRATION: Membership checkout
                - Patreon → PATREON_URL
                - Stripe recurring → STRIPE_LINKS.supportDjLiz / supportDjMerci
              */}
              <KingzIntegrationLink href={tier.storeUrl} label={tier.storeLabel} variant="gold" className="w-full text-sm" />
            </article>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-12" data-kingz-reveal>
          <KingzCtaAction label="Buy Us a Coffee" href={BUY_ME_A_COFFEE_URL} variant="glass" external />
          <KingzCtaAction label="Join Patreon" href={PATREON_URL} variant="purple" external />
        </div>
      </div>
    </section>
  )
}
