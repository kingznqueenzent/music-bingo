'use client'

import { Youtube, Music2 } from 'lucide-react'
import { YOUTUBE_EMBEDS, INSTAGRAM_LINKS, TIKTOK_LINKS, integrationHref } from '@/lib/kingz/integrations'
import { KINGZ_SOCIAL_URLS } from '@/lib/kingz/social'
import { useKingzReveal } from './useKingzGsap'

/**
 * Social video embed placeholders.
 * Paste selected embed URLs in lib/kingz/integrations.ts when ready — never invent video IDs.
 */
export function KingzSocialEmbeds() {
  const ref = useKingzReveal<HTMLElement>()
  const btsEmbed = integrationHref(YOUTUBE_EMBEDS.behindTheScenes)
  const youtubeChannel = KINGZ_SOCIAL_URLS.youtube
  const tiktokProfile = integrationHref(TIKTOK_LINKS.profile) || KINGZ_SOCIAL_URLS.tiktok
  const instagramProfile = integrationHref(INSTAGRAM_LINKS.profile)

  return (
    <section ref={ref} className="kingz-section bg-[#0d0d14]" aria-labelledby="social-embeds-heading">
      <div className="kingz-container">
        <h2 id="social-embeds-heading" className="kingz-heading text-2xl text-[#D4AF37] text-center mb-8" data-kingz-reveal>
          Behind the Scenes
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
              <div className="text-center px-6 space-y-4">
                <Youtube className="h-8 w-8 text-[#D4AF37] mx-auto" aria-hidden />
                <p className="text-[#b0b0b0] text-sm">
                  Selected YouTube embeds will appear here when official video URLs are configured.
                </p>
                {youtubeChannel ? (
                  <a
                    href={youtubeChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Kingz & Queenz on YouTube"
                    className="kingz-btn-gold inline-flex items-center justify-center gap-2 min-h-11 touch-manipulation"
                  >
                    <Youtube className="h-5 w-5" aria-hidden />
                    Watch on YouTube
                  </a>
                ) : null}
              </div>
            )}
          </div>

          <div data-kingz-reveal className="space-y-4">
            <div className="kingz-glass p-6">
              <h3 className="kingz-heading text-lg text-[#f5f5f5] mb-2">Instagram</h3>
              {instagramProfile ? (
                <a
                  href={instagramProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Kingz & Queenz on Instagram"
                  className="kingz-btn-outline text-sm inline-flex items-center min-h-11 touch-manipulation"
                >
                  View on Instagram
                </a>
              ) : (
                <span className="text-[#b0b0b0] text-xs">Instagram profile link coming soon</span>
              )}
            </div>

            <div className="kingz-glass p-6">
              <h3 className="kingz-heading text-lg text-[#f5f5f5] mb-2">TikTok</h3>
              <p className="text-[#b0b0b0] text-sm mb-4">
                Follow live clips and sets on our official TikTok.
              </p>
              {tiktokProfile ? (
                <a
                  href={tiktokProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Kingz & Queenz on TikTok"
                  className="kingz-btn-purple text-sm inline-flex items-center justify-center gap-2 min-h-11 touch-manipulation"
                >
                  <Music2 className="h-4 w-4" aria-hidden />
                  View on TikTok
                </a>
              ) : (
                <span className="text-[#b0b0b0] text-xs">TikTok profile link coming soon</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
