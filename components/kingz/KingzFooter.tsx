import { KINGZ_CONTACT, NAV_LINKS } from '@/lib/kingz/data'
import { ETSY_STORE_URL, PATREON_URL, BUY_ME_A_COFFEE_URL, integrationHref } from '@/lib/kingz/integrations'
import { KingzLogo } from './KingzLogo'

export function KingzFooter() {
  const year = new Date().getFullYear()
  const etsy = integrationHref(ETSY_STORE_URL)
  const bmc = integrationHref(BUY_ME_A_COFFEE_URL)
  const patreon = integrationHref(PATREON_URL)

  return (
    <footer className="bg-[#050505] border-t border-[rgba(212,175,55,0.25)] pt-16 pb-10 px-6" role="contentinfo">
      <div className="kingz-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          <div>
            <div className="mb-4">
              <KingzLogo size="footer" variant="full" lazy />
            </div>
            <p className="text-[#b0b0b0] text-sm leading-relaxed">
              Kingz &amp; Queenz Entertainment — premium DJ experiences with DJ Merci &amp; DJ Liz.
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
                    Patreon
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="kingz-heading text-[#D4AF37] text-sm mb-4 uppercase tracking-widest">Live</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={KINGZ_CONTACT.twitch}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kingz-footer-link text-[#D4AF37] hover:text-[#f5d276] transition-colors"
                >
                  Twitch
                </a>
              </li>
              <li>
                <a
                  href={KINGZ_CONTACT.kick}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kingz-footer-link text-[#D4AF37] hover:text-[#f5d276] transition-colors"
                >
                  Kick
                </a>
              </li>
            </ul>
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
