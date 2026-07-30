import { KINGZ_CONTACT, NAV_LINKS } from '@/lib/kingz/data'
import { PATREON_URL, BUY_ME_A_COFFEE_URL, PRINTIFY_STORE_URL } from '@/lib/kingz/integrations'
import { integrationHref } from '@/lib/kingz/integrations'
import { KingzLogo } from './KingzLogo'
import { StaffAccessFooterLink } from '@/components/layout/StaffAccessFooterLink'

export function KingzFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#050505] border-t border-[rgba(212,175,55,0.25)] pt-16 pb-10 px-6" role="contentinfo">
      <div className="kingz-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          <div>
            <div className="mb-4">
              <KingzLogo size="footer" variant="full" lazy />
            </div>
            <p className="text-[#b0b0b0] text-sm leading-relaxed">
              Premium DJ entertainment for weddings, corporate events, and celebrations in Brantford, ON.
            </p>
          </div>

          <div>
            <h3 className="kingz-heading text-[#D4AF37] text-sm mb-4 uppercase tracking-widest">Contact</h3>
            <ul className="space-y-2 text-sm text-[#d4d4d4]">
              <li>
                <a href={KINGZ_CONTACT.phoneHref} className="hover:text-[#D4AF37] transition-colors">
                  {KINGZ_CONTACT.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${KINGZ_CONTACT.email}`} className="hover:text-[#D4AF37] transition-colors break-all">
                  {KINGZ_CONTACT.email}
                </a>
              </li>
              <li>{KINGZ_CONTACT.location}</li>
            </ul>
          </div>

          <div>
            <h3 className="kingz-heading text-[#D4AF37] text-sm mb-4 uppercase tracking-widest">Navigate</h3>
            <ul className="space-y-2 text-sm">
              {NAV_LINKS.map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-[#d4d4d4] hover:text-[#D4AF37] transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="kingz-heading text-[#D4AF37] text-sm mb-4 uppercase tracking-widest">Merch &amp; Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#merch" className="text-[#d4d4d4] hover:text-[#D4AF37] transition-colors">
                  Shop Merch
                </a>
              </li>
              <li>
                <a href="#support" className="text-[#d4d4d4] hover:text-[#D4AF37] transition-colors">
                  Support the DJs
                </a>
              </li>
              <li>
                <a href="#merch-drops" className="text-[#d4d4d4] hover:text-[#D4AF37] transition-colors">
                  Merch Drops
                </a>
              </li>
              {integrationHref(PATREON_URL) && (
                <li>
                  <a
                    href={integrationHref(PATREON_URL)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8b5cb8] hover:text-[#D4AF37] transition-colors"
                  >
                    Patreon
                  </a>
                </li>
              )}
              {integrationHref(BUY_ME_A_COFFEE_URL) && (
                <li>
                  <a
                    href={integrationHref(BUY_ME_A_COFFEE_URL)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8b5cb8] hover:text-[#D4AF37] transition-colors"
                  >
                    Buy Me a Coffee
                  </a>
                </li>
              )}
              {integrationHref(PRINTIFY_STORE_URL) && (
                <li>
                  <a
                    href={integrationHref(PRINTIFY_STORE_URL)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8b5cb8] hover:text-[#D4AF37] transition-colors"
                  >
                    Printify Store
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
                  className="text-[#D4AF37] hover:text-[#f5d276] transition-colors"
                >
                  Twitch
                </a>
              </li>
              <li>
                <a
                  href={KINGZ_CONTACT.kick}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D4AF37] hover:text-[#f5d276] transition-colors"
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
        <p className="text-center mt-3">
          <StaffAccessFooterLink
            from="/host"
            className="text-xs text-[#b0b0b0]/70 hover:text-[#D4AF37]/90 transition-colors"
          />
        </p>
      </div>
    </footer>
  )
}
