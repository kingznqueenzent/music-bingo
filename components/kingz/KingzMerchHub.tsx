'use client'

import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { ETSY_STORE_URL, FEATURED_MERCH_PRODUCTS } from '@/lib/kingz/merch'
import { integrationHref } from '@/lib/kingz/integrations'
import { KingzIntegrationLink, KingzCtaAction } from './KingzIntegrationLink'
import { KingzLogo } from './KingzLogo'
import { useKingzReveal } from './useKingzGsap'

/**
 * THE ROYAL COLLECTION — Kingz & Queenz branded merch showcase.
 * Checkout lives on Etsy only (StrictlyShopping). No Shopify / Printify / Printful.
 */
export function KingzMerchHub() {
  const ref = useKingzReveal<HTMLElement>()
  const etsy = integrationHref(ETSY_STORE_URL)
  const products = FEATURED_MERCH_PRODUCTS.filter((p) => Boolean(p.image && p.etsyUrl))

  return (
    <section id="merch" ref={ref} className="kingz-section kingz-section-purple" aria-labelledby="merch-heading">
      <div className="kingz-container">
        <div className="text-center mb-10" data-kingz-reveal>
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <p className="text-[#8b5cb8] text-xs uppercase tracking-[0.35em] mb-3">Official Merchandise</p>
          <h2 id="merch-heading" className="kingz-heading text-3xl lg:text-5xl font-semibold kingz-gold-gradient">
            The Royal Collection
          </h2>
          <p className="text-[#b0b0b0] mt-4 max-w-2xl mx-auto text-lg">
            Wear the Sound. Represent the Kingdom.
          </p>
          <p className="text-[#8a8a8a] mt-3 text-sm max-w-xl mx-auto">
            Official Kingz &amp; Queenz Entertainment merch — browse and purchase securely on Etsy.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-12" data-kingz-reveal>
          <KingzIntegrationLink
            href={ETSY_STORE_URL}
            label="Shop the Royal Collection"
            variant="gold"
            className="uppercase tracking-[0.12em] text-sm"
            ariaLabel="Shop the Royal Collection on Etsy (opens in new tab)"
          />
          <KingzIntegrationLink
            href={ETSY_STORE_URL}
            label="View All Merch"
            variant="outline"
            className="uppercase tracking-[0.12em] text-sm"
            ariaLabel="View all merch on Etsy (opens in new tab)"
          />
        </div>

        <div
          data-kingz-reveal
          className="kingz-royal-merch-panel mb-14 relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.35)]"
        >
          <div className="absolute inset-0 kingz-royal-merch-panel__glow" aria-hidden />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 px-8 py-12 md:px-14 md:py-14">
            <div className="shrink-0">
              <KingzLogo size="footer" variant="full" lazy />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-[#D4AF37] text-xs uppercase tracking-[0.28em] mb-3">Kingz &amp; Queenz Entertainment</p>
              <h3 className="kingz-heading text-2xl md:text-3xl text-[#f5f5f5] mb-3">
                The Kingdom, on your sleeve
              </h3>
              <p className="text-[#b0b0b0] text-sm md:text-base leading-relaxed mb-6 max-w-xl">
                Discover the Royal Collection on our official Etsy shop. Every purchase is completed on Etsy —
                no separate checkout on this site.
              </p>
              {etsy ? (
                <a
                  href={etsy}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#D4AF37] text-sm hover:text-[#f5d276] transition-colors break-all min-h-11"
                >
                  etsy.com/shop/StrictlyShopping
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {products.length > 0 ? (
          <>
            <h3 className="kingz-heading text-xl text-[#f5f5f5] text-center mb-8" data-kingz-reveal>
              Featured Pieces
            </h3>
            <div className="kingz-product-grid mb-12">
              {products.map((item) => (
                <article
                  key={item.id}
                  data-kingz-reveal
                  className="kingz-glass kingz-glass-hover overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-square bg-[#0a0a0a]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h4 className="kingz-heading text-lg text-[#D4AF37] mb-4">{item.name}</h4>
                    <KingzIntegrationLink
                      href={item.etsyUrl}
                      label="View on Etsy"
                      variant="purple"
                      className="w-full text-sm mt-auto uppercase tracking-[0.08em]"
                      ariaLabel={`View ${item.name} on Etsy (opens in new tab)`}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap justify-center gap-4" data-kingz-reveal>
          <KingzCtaAction
            label="Shop the Royal Collection"
            href={ETSY_STORE_URL}
            variant="gold"
            external
            className="uppercase tracking-[0.12em] text-sm"
          />
          <KingzCtaAction
            label="View All Merch"
            href={ETSY_STORE_URL}
            variant="outline"
            external
            className="uppercase tracking-[0.12em] text-sm"
          />
        </div>
      </div>
    </section>
  )
}
