'use client'

import Image from 'next/image'
import { Store, Coffee, Heart, ShoppingBag } from 'lucide-react'
import { STORE_INTEGRATIONS, FEATURED_MERCH } from '@/lib/kingz/merch'
import { KingzIntegrationLink } from './KingzIntegrationLink'

const ICONS = {
  printify: Store,
  printful: ShoppingBag,
  coffee: Coffee,
  patreon: Heart,
  shopify: Store,
  stripe: Store,
} as const

export function KingzStoreIntegrations() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {STORE_INTEGRATIONS.map((store) => {
        const Icon = ICONS[store.icon] ?? Store
        return (
          <article
            key={store.id}
            data-kingz-reveal
            className="kingz-glass kingz-glass-hover p-6 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2.5 rounded-lg bg-[#5A2D91]/20 text-[#8b5cb8]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="kingz-heading text-lg text-[#f5f5f5]">{store.name}</h3>
            </div>
            <p className="text-[#b0b0b0] text-sm leading-relaxed flex-1 mb-6">{store.description}</p>
            {/*
              INTEGRATION: Paste store URL in lib/kingz/integrations.ts
              - Printify → PRINTIFY_STORE_URL
              - Printful → PRINTFUL_STORE_URL
              - Buy Me a Coffee → BUY_ME_A_COFFEE_URL
              - Patreon → PATREON_URL
              - Shopify → SHOPIFY_LINKS.storefront
            */}
            <KingzIntegrationLink
              href={store.url}
              label={store.cta}
              variant={store.icon === 'patreon' ? 'purple' : store.icon === 'coffee' ? 'glass' : 'outline'}
              className="w-full"
            />
          </article>
        )
      })}
    </div>
  )
}

/** Featured merchandise product grid */
export function KingzFeaturedMerchGrid() {
  return (
    <div className="kingz-product-grid">
      {FEATURED_MERCH.map((item) => (
        <article key={item.id} data-kingz-reveal className="kingz-glass kingz-glass-hover overflow-hidden group">
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {item.badge && (
              <span className="absolute top-3 left-3 text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-[#5A2D91]/90 text-white font-semibold">
                {item.badge}
              </span>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
          </div>
          <div className="p-5">
            <p className="text-[#8b5cb8] text-xs uppercase tracking-widest mb-1">{item.category.replace('-', ' ')}</p>
            <h3 className="kingz-heading text-lg text-[#f5f5f5] mb-1">{item.name}</h3>
            <p className="text-[#D4AF37] font-bold mb-2">{item.priceLabel}</p>
            <p className="text-[#b0b0b0] text-sm mb-4 line-clamp-2">{item.description}</p>
            {/*
              INTEGRATION: Per-product URL in lib/kingz/merch.ts (storeUrl field)
              Or paste Shopify product embed below:
              <div id="shopify-buy-button-{product-id}" />
            */}
            <KingzIntegrationLink href={item.storeUrl} label={item.storeLabel} variant="gold" className="w-full text-sm" />
          </div>
        </article>
      ))}
    </div>
  )
}
