'use client'

import { YOUTUBE_EMBEDS, INSTAGRAM_LINKS, TIKTOK_LINKS, integrationHref } from '@/lib/kingz/integrations'
import { useKingzReveal } from './useKingzGsap'

/**
 * Social video embed placeholders.
 * Paste embed URLs in lib/kingz/integrations.ts when ready.
 */
export function KingzSocialEmbeds() {
  const ref = useKingzReveal<HTMLElement>()
  const btsEmbed = integrationHref(YOUTUBE_EMBEDS.behindTheScenes)

  return (
    <section ref={ref} className="kingz-section bg-[#0d0d14]" aria-labelledby="social-embeds-heading">
      <div className="kingz-container">
        <h2 id="social-embeds-heading" className="kingz-heading text-2xl text-[#D4AF37] text-center mb-8" data-kingz-reveal>
          Behind the Scenes
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* YOUTUBE EMBED — paste URL in lib/kingz/integrations.ts → YOUTUBE_EMBEDS.behindTheScenes */}
          <div data-kingz-reveal className="kingz-glass overflow-hidden aspect-video flex items-center justify-center">
            {btsEmbed ? (
              <iframe
                src={btsEmbed}
                title="Behind the scenes — Kingz and Queenz Entertainment"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <p className="text-[#b0b0b0] text-sm text-center px-6">
                YouTube embed — configure <code className="text-[#8b5cb8]">YOUTUBE_EMBEDS.behindTheScenes</code> in{' '}
                <code className="text-[#8b5cb8]">lib/kingz/integrations.ts</code>
              </p>
            )}
          </div>

          <div data-kingz-reveal className="space-y-4">
            {/* INSTAGRAM — paste profile or reel link in lib/kingz/integrations.ts → INSTAGRAM_LINKS */}
            <div className="kingz-glass p-6">
              <h3 className="kingz-heading text-lg text-[#f5f5f5] mb-2">Instagram</h3>
              <p className="text-[#b0b0b0] text-sm mb-4">
                Embed reel: paste oEmbed or link in INSTAGRAM_LINKS.merchReel
              </p>
              {integrationHref(INSTAGRAM_LINKS.profile) ? (
                <a
                  href={integrationHref(INSTAGRAM_LINKS.profile)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kingz-btn-outline text-sm"
                >
                  View on Instagram
                </a>
              ) : (
                <span className="text-[#b0b0b0] text-xs">INSTAGRAM_LINKS.profile not configured</span>
              )}
            </div>

            {/* TIKTOK — paste profile or video link in lib/kingz/integrations.ts → TIKTOK_LINKS */}
            <div className="kingz-glass p-6">
              <h3 className="kingz-heading text-lg text-[#f5f5f5] mb-2">TikTok</h3>
              <p className="text-[#b0b0b0] text-sm mb-4">
                Embed blockquote or link: TIKTOK_LINKS.djSetClip
              </p>
              {integrationHref(TIKTOK_LINKS.profile) ? (
                <a
                  href={integrationHref(TIKTOK_LINKS.profile)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kingz-btn-purple text-sm"
                >
                  View on TikTok
                </a>
              ) : (
                <span className="text-[#b0b0b0] text-xs">TIKTOK_LINKS.profile not configured</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
