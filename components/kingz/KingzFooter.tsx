import { Youtube, Twitch, Music2, Radio, Instagram, Facebook, Globe } from 'lucide-react'
import { KINGZ_CONTACT, NAV_LINKS } from '@/lib/kingz/data'
import { ETSY_STORE_URL, PATREON_URL, BUY_ME_A_COFFEE_URL, integrationHref } from '@/lib/kingz/integrations'
import {
  getConfirmedSocialChannels,
  getOwnChannelState,
  type KingzSocialKey,
} from '@/lib/kingz/social'
import { KingzLogo } from './KingzLogo'

const SOCIAL_ICONS: Partial<Record<KingzSocialKey, typeof Youtube>> = {
  youtube: Youtube,
  twitch: Twitch,
  tiktok: Music2,
  kick: Radio,
  instagram: Instagram,
  facebook: Facebook,
  own: Globe,
  mixcloud: Music2,
  soundcloud: Music2,
}

export function KingzFooter() {
  const year = new Date().getFullYear()
  const etsy = integrationHref(ETSY_STORE_URL)
  const bmc = integrationHref(BUY_ME_A_COFFEE_URL)
  const patreon = integrationHref(PATREON_URL)
  const socialChannels = getConfirmedSocialChannels()
  const own = getOwnChannelState()

  return (
    <footer className="bg-[#050505] border-t border-[rgba(212,175,55,0.25)] pt-16 pb-10 px-6" role="contentinfo">
      <div className="kingz-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          <div>
            <div className="mb-4">
              <KingzLogo size="footer" variant="full" lazy />
            </div>
            <p className="text-[#b0b0b0] text-sm leading-relaxed">
              Kingz &amp; Queenz Entertainment — Brantford-based DJ experiences with DJ Merci &amp; DJ Liz,
              available throughout Southern Ontario.
            </p>
          </div>

          <div>
            <h3 className="kingz-heading text-[#D4AF37] text-sm mb-4 uppercase tracking-widest">Contact</h3>
            <ul className="space-y-2 text-sm text-[#d4d4d4]">
              {KINGZ_CONTACT.phone && KINGZ_CONTACT.phoneHref ? (
                <li>
                  <a href={KINGZ_CONTACT.phoneHref} className="hover:text-[#D4AF37] transition-colors">
                    {KINGZ_CONTACT.phone}
                  </a>
                </li>
              ) : null}
              {KINGZ_CONTACT.email ? (
                <li>
                  <a href={`mailto:${KINGZ_CONTACT.email}`} className="hover:text-[#D4AF37] transition-colors break-all">
                    {KINGZ_CONTACT.email}
                  </a>
                </li>
              ) : null}
              {KINGZ_CONTACT.location ? <li>{KINGZ_CONTACT.location}</li> : null}
            </ul>
          </div>

          <div>
            <h3 className="kingz-heading text-[#D4AF37] text-sm mb-4 uppercase tracking-widest">Navigate</h3>
            <ul className="space-y-2 text-sm">
              {NAV_LINKS.map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} className="kingz-footer-link text-[#d4d4d4] hover:text-[#D4AF37] transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="kingz-heading text-[#D4AF37] text-sm mb-4 uppercase tracking-widest">Royal Collection</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#merch" className="kingz-footer-link text-[#d4d4d4] hover:text-[#D4AF37] transition-colors">
                  Merch on Site
                </a>
              </li>
              {etsy && (
                <li>
                  <a
                    href={etsy}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kingz-footer-link text-[#D4AF37] hover:text-[#f5d276] transition-colors"
                  >
                    Shop the Royal Collection
                  </a>
                </li>
              )}
              {etsy && (
                <li>
                  <a
                    href={etsy}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kingz-footer-link text-[#d4d4d4] hover:text-[#D4AF37] transition-colors"
                  >
                    View All Merch
                  </a>
                </li>
              )}
              {bmc && (
                <li>
                  <a
                    href={bmc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kingz-footer-link text-[#8b5cb8] hover:text-[#D4AF37] transition-colors"
                  >
                    Buy Me a Coffee
                  </a>
                </li>
              )}
              {patreon && (
                <li>
                  <a
                    href={patreon}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kingz-footer-link text-[#8b5cb8] hover:text-[#D4AF37] transition-colors"
                  >
                    Become Royalty
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="kingz-heading text-[#D4AF37] text-sm mb-4 uppercase tracking-widest">Live &amp; Social</h3>
            {/* Mobile-friendly: 2-col grid of large touch targets, not a tiny icon strip */}
            <ul className="grid grid-cols-2 gap-2 sm:gap-3">
              {socialChannels.map((channel) => {
                const Icon = SOCIAL_ICONS[channel.key] || Globe
                return (
                  <li key={channel.key}>
                    <a
                      href={channel.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={channel.ariaLabel}
                      className="flex items-center gap-2 min-h-11 px-3 py-2 rounded-md border border-[rgba(212,175,55,0.2)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.4)] transition-colors touch-manipulation text-sm"
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      <span>{channel.label}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
            {!own.verified ? (
              <p className="mt-3 text-xs text-[#8a8a8a] flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" aria-hidden />
                OWN @{own.handle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="kingz-deco-divider mb-8" aria-hidden />
        <p className="text-center text-[#b0b0b0] text-sm">
          © {year} Kingz &amp; Queenz Entertainment. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
