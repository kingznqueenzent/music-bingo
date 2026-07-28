'use client'

import Image from 'next/image'
import { DJ_MERCH_COLLECTIONS } from '@/lib/kingz/merch'
import { KingzIntegrationLink } from './KingzIntegrationLink'
import { useKingzReveal } from './useKingzGsap'

/** DJ Liz & DJ Merci dedicated merch collections */
export function KingzDjMerch() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section ref={ref} className="kingz-section bg-[#1a1a1a]" aria-labelledby="dj-merch-heading">
      <div className="kingz-container">
        <div className="text-center mb-12" data-kingz-reveal>
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <h2 id="dj-merch-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
            DJ Collections
          </h2>
          <p className="text-[#b0b0b0] mt-4">Signature merch from DJ Liz and DJ Merci.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {DJ_MERCH_COLLECTIONS.map((col) => (
            <div key={col.slug} data-kingz-reveal>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#D4AF37]/50 shrink-0">
                  <Image src={col.image} alt={col.dj} fill sizes="64px" className="object-cover" />
                </div>
                <div>
                  <h3 className="kingz-heading text-2xl text-[#f5f5f5]">{col.dj} Merch</h3>
                  <p className="text-[#8b5cb8] text-sm">{col.tagline}</p>
                </div>
              </div>

              <div className="space-y-4">
                {col.items.length > 0 ? (
                  col.items.map((item) => (
                    <article key={item.id} className="kingz-glass kingz-glass-hover flex gap-4 p-4">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                        <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="kingz-heading text-[#f5f5f5] text-sm">{item.name}</h4>
                        <p className="text-[#D4AF37] text-sm font-bold">{item.priceLabel}</p>
                        <KingzIntegrationLink
                          href={item.storeUrl}
                          label={item.storeLabel}
                          variant="outline"
                          className="mt-2 text-xs py-2 px-3 min-h-0"
                        />
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-[#b0b0b0] text-sm kingz-glass p-4">
                    Add products in lib/kingz/merch.ts → FEATURED_MERCH with category dj-{col.slug}
                  </p>
                )}
              </div>

              {/*
                INTEGRATION: Full DJ collection store
                - DJ Liz → PRINTIFY_STORE_URL or SHOPIFY collection link
                - DJ Merci → PRINTFUL_STORE_URL or SHOPIFY collection link
              */}
              <KingzIntegrationLink
                href={col.storeUrl}
                label={`Shop All ${col.dj} Merch`}
                variant={col.slug === 'liz' ? 'purple' : 'gold'}
                className="w-full mt-6"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
