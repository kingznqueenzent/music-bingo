'use client'

import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import { MERCH_DROPS } from '@/lib/kingz/merch'
import { KingzIntegrationLink } from './KingzIntegrationLink'
import { useKingzReveal } from './useKingzGsap'

export function KingzMerchDrops() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section id="merch-drops" ref={ref} className="kingz-section kingz-section-purple" aria-labelledby="drops-heading">
      <div className="kingz-container">
        <div className="text-center mb-12" data-kingz-reveal>
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <div className="inline-flex items-center gap-2 text-[#8b5cb8] text-xs uppercase tracking-[0.3em] mb-4">
            <Sparkles className="h-4 w-4" aria-hidden />
            Limited Availability
          </div>
          <h2 id="drops-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold kingz-gold-gradient">
            Merch Drops
          </h2>
          <p className="text-[#b0b0b0] mt-4 max-w-2xl mx-auto">
            Limited-edition Kingz &amp; Queenz apparel, tour exclusives, digital mixtapes, and VIP bundles.
          </p>
        </div>

        <div className="kingz-product-grid">
          {MERCH_DROPS.map((drop) => (
            <article
              key={drop.id}
              data-kingz-reveal
              className="kingz-glass kingz-glass-hover overflow-hidden relative"
            >
              {drop.limited && (
                <span className="absolute top-4 right-4 z-10 flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#050505]/80 border border-[#D4AF37]/50 text-[#f5d276]">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Limited
                </span>
              )}
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={drop.image}
                  alt={drop.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />
              </div>
              <div className="p-5">
                <p className="text-[#8b5cb8] text-xs uppercase tracking-widest mb-1">{drop.type}</p>
                <h3 className="kingz-heading text-lg text-[#f5f5f5] mb-1">{drop.name}</h3>
                <p className="text-[#D4AF37] font-bold mb-2">{drop.priceLabel}</p>
                {drop.unitsLeft && (
                  <p className="text-[#f5d276] text-xs mb-2 font-medium">{drop.unitsLeft}</p>
                )}
                <p className="text-[#b0b0b0] text-sm mb-4">{drop.description}</p>
                {/*
                  INTEGRATION: Drop checkout URL in lib/kingz/merch.ts → MERCH_DROPS[].storeUrl
                  Options: Printify product link, Printful product link, Stripe payment link, Shopify product URL
                */}
                <KingzIntegrationLink href={drop.storeUrl} label={drop.storeLabel} variant="purple" className="w-full text-sm" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
