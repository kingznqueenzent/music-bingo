'use client'

import { KingzCtaStrip } from './KingzCtaStrip'
import { KingzStoreIntegrations, KingzFeaturedMerchGrid } from './KingzStoreIntegrations'
import { KingzEventPackages } from './KingzEventPackages'
import { useKingzReveal } from './useKingzGsap'

/**
 * Merch & Support ecosystem hub — Printify, Printful, BMC, Patreon, Stripe, Shopify.
 *
 * FUTURE integrations (do NOT connect yet):
 * - Printify / Printful / Shopify / Stripe URLs → config/site-config.js → merch
 * - Product photos → public/assets/merch/
 *
 * Until URLs are real, buttons show Coming Soon (no fake checkout).
 */
export function KingzMerchHub() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section id="merch" ref={ref} className="kingz-section kingz-section-purple" aria-labelledby="merch-heading">
      <div className="kingz-container">
        <div className="text-center mb-12" data-kingz-reveal>
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <h2 id="merch-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold kingz-gold-gradient">
            Merch &amp; Support
          </h2>
          <p className="text-[#b0b0b0] mt-4 max-w-2xl mx-auto">
            Official apparel, digital mixtapes, event packages, and ways to support DJ Liz &amp; DJ Merci.
          </p>
        </div>

        <div className="mb-16" data-kingz-reveal>
          <KingzCtaStrip />
        </div>

        <div className="mb-16">
          <h3 className="kingz-heading text-xl text-[#f5f5f5] text-center mb-8" data-kingz-reveal>
            Store Integrations
          </h3>
          <KingzStoreIntegrations />
        </div>

        <div className="mb-16">
          <h3 className="kingz-heading text-xl text-[#f5f5f5] text-center mb-8" data-kingz-reveal>
            Featured Merchandise
          </h3>
          <KingzFeaturedMerchGrid />
        </div>

        <KingzEventPackages />

        {/*
          FUTURE STORE INTEGRATIONS — do not connect yet:
          Printify / Printful / Shopify Buy Button / Stripe Payment Links
          Paste URLs in config/site-config.js → merch when ready.
          Product images: public/assets/merch/
        */}
      </div>
    </section>
  )
}
