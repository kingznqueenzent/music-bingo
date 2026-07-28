'use client'

import Image from 'next/image'
import { EVENT_PACKAGES, DIGITAL_PRODUCTS } from '@/lib/kingz/merch'
import { KingzIntegrationLink } from './KingzIntegrationLink'

export function KingzEventPackages() {
  return (
    <div>
      <h3 className="kingz-heading text-2xl text-[#D4AF37] text-center mb-8" data-kingz-reveal>
        Event Package Sales
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {EVENT_PACKAGES.map((pkg) => (
          <article
            key={pkg.id}
            data-kingz-reveal
            className={`kingz-glass kingz-glass-hover p-8 flex flex-col ${
              pkg.featured ? 'ring-1 ring-[#D4AF37]/60 kingz-glow-border' : ''
            }`}
          >
            {pkg.featured && (
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] mb-3">Most Popular</span>
            )}
            <h4 className="kingz-heading text-xl text-[#f5f5f5] mb-2">{pkg.name}</h4>
            <p className="text-3xl font-bold text-[#D4AF37] mb-4">{pkg.priceLabel}</p>
            <p className="text-[#b0b0b0] text-sm mb-5">{pkg.description}</p>
            <ul className="text-[#d4d4d4] text-sm space-y-1.5 mb-6 flex-1">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#8b5cb8]" aria-hidden>◆</span> {f}
                </li>
              ))}
            </ul>
            <div className="space-y-3">
              {/*
                INTEGRATION: Stripe Payment Links — paste in lib/kingz/integrations.ts → STRIPE_LINKS
                Example: essentialPackage, premiumPackage, royalPackage
              */}
              <KingzIntegrationLink href={pkg.stripeUrl} label="Pay with Stripe" variant="gold" className="w-full" />
              <button
                type="button"
                className="kingz-btn-outline w-full text-sm"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Request Custom Quote
              </button>
            </div>
          </article>
        ))}
      </div>

      <h3 className="kingz-heading text-2xl text-[#D4AF37] text-center mb-8" data-kingz-reveal>
        Digital Mixtapes &amp; Downloads
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {DIGITAL_PRODUCTS.map((product) => (
          <article key={product.id} data-kingz-reveal className="kingz-glass kingz-glass-hover overflow-hidden">
            <div className="relative aspect-video">
              <Image src={product.image} alt={product.name} fill sizes="33vw" className="object-cover" />
              <div className="absolute inset-0 bg-[#5A2D91]/10 mix-blend-overlay" />
            </div>
            <div className="p-5">
              <p className="text-[#8b5cb8] text-xs uppercase tracking-widest mb-1">{product.format}</p>
              <h4 className="kingz-heading text-lg text-[#f5f5f5] mb-1">{product.name}</h4>
              <p className="text-[#D4AF37] font-bold mb-2">{product.priceLabel}</p>
              <p className="text-[#b0b0b0] text-sm mb-4">{product.description}</p>
              {/*
                INTEGRATION: Digital sales
                - Stripe payment link → STRIPE_LINKS.mixtapeVol1 / mixtapeVol2
                - Shopify digital product → SHOPIFY_LINKS.storefront
              */}
              <KingzIntegrationLink href={product.storeUrl} label={product.storeLabel} variant="purple" className="w-full text-sm" />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
