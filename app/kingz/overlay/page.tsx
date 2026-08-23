import siteConfig from '@/config/site-config'

export const dynamic = 'force-dynamic'

/** OBS / Meld browser source for Kingz & Queenz livestreams — not Music Bingo. */
export default function KingzOverlayPage() {
  const name = siteConfig.brand.name
  const tagline = siteConfig.brand.tagline

  return (
    <main className="kingz-overlay">
      <div className="kingz-overlay-lower-third">
        <p className="disco-text">{name}</p>
        <p className="gold-accent">{tagline}</p>
      </div>
    </main>
  )
}
