'use client'

import { useState, useEffect } from 'react'
import { Play, Youtube, Twitch, Music2, Radio, Globe } from 'lucide-react'
import { useKingzReveal } from './useKingzGsap'
import {
  KINGZ_SOCIAL_URLS,
  getOwnChannelState,
} from '@/lib/kingz/social'
import { YOUTUBE_EMBEDS, integrationHref } from '@/lib/kingz/integrations'

const externalLinkProps = {
  target: '_blank' as const,
  rel: 'noopener noreferrer',
}

/**
 * Livestream / watch section — official channel CTAs + Twitch/Kick players.
 * YouTube embed slot ready via YOUTUBE_EMBEDS.livestreamSet (no invented URLs).
 */
export function KingzLivestreams() {
  const ref = useKingzReveal<HTMLElement>()
  const [loadTwitch, setLoadTwitch] = useState(false)
  const [parentDomain, setParentDomain] = useState('kingznqueenzent.ca')
  const own = getOwnChannelState()
  const ytEmbed = integrationHref(YOUTUBE_EMBEDS.livestreamSet)

  useEffect(() => {
    setParentDomain(window.location.hostname)
  }, [])

  const watchCtas = [
    KINGZ_SOCIAL_URLS.tiktok
      ? {
          key: 'tiktok',
          href: KINGZ_SOCIAL_URLS.tiktok,
          label: 'Watch on TikTok',
          ariaLabel: 'Watch Kingz & Queenz live on TikTok',
          icon: Music2,
          className: 'kingz-btn-purple',
        }
      : null,
    KINGZ_SOCIAL_URLS.youtube
      ? {
          key: 'youtube',
          href: KINGZ_SOCIAL_URLS.youtube,
          label: 'Watch on YouTube',
          ariaLabel: 'Watch Kingz & Queenz live on YouTube',
          icon: Youtube,
          className: 'kingz-btn-gold',
        }
      : null,
    KINGZ_SOCIAL_URLS.twitch
      ? {
          key: 'twitch',
          href: KINGZ_SOCIAL_URLS.twitch,
          label: 'Watch on Twitch',
          ariaLabel: 'Watch Kingz & Queenz live on Twitch',
          icon: Twitch,
          className: 'kingz-btn-outline',
        }
      : null,
    KINGZ_SOCIAL_URLS.kick
      ? {
          key: 'kick',
          href: KINGZ_SOCIAL_URLS.kick,
          label: 'Watch on Kick',
          ariaLabel: 'Watch Kingz & Queenz live on Kick',
          icon: Radio,
          className: 'kingz-btn-outline',
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string
    href: string
    label: string
    ariaLabel: string
    icon: typeof Music2
    className: string
  }>

  return (
    <section id="livestreams" ref={ref} className="kingz-section" aria-labelledby="livestreams-heading">
      <div className="kingz-container text-center mb-10 sm:mb-12">
        <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
        <h2
          id="livestreams-heading"
          className="kingz-heading text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#D4AF37] mb-4 tracking-wide"
        >
          Watch Kingz &amp; Queenz Live
        </h2>
        <p className="text-[#d4d4d4] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed px-1">
          Watch DJ Merci and DJ Liz perform, stream, mix, and connect across our official channels.
        </p>
        <div className="kingz-deco-divider max-w-xs mx-auto mt-6" aria-hidden />
      </div>

      {/* Premium platform CTAs — stacked on mobile for ~44px+ touch targets */}
      <div className="kingz-container mb-10 sm:mb-12">
        <div
          className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-3xl mx-auto"
          data-kingz-reveal
        >
          {watchCtas.map(({ key, href, label, ariaLabel, icon: Icon, className }) => (
            <a
              key={key}
              href={href}
              {...externalLinkProps}
              aria-label={ariaLabel}
              className={`${className} inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto px-5 touch-manipulation`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="uppercase tracking-[0.12em] text-sm font-semibold">{label}</span>
            </a>
          ))}
        </div>

        {/* OWN — handle confirmed; clickable only when share URL verified */}
        <div className="mt-6 flex justify-center" data-kingz-reveal>
          {own.verified && own.href ? (
            <a
              href={own.href}
              {...externalLinkProps}
              aria-label="Follow Kingz & Queenz on OWN"
              className="kingz-btn-outline inline-flex items-center justify-center gap-2 min-h-11 px-5 touch-manipulation"
            >
              <Globe className="h-5 w-5 shrink-0" aria-hidden />
              <span className="uppercase tracking-[0.12em] text-sm font-semibold">Follow Us on OWN</span>
            </a>
          ) : (
            <p
              className="inline-flex items-center gap-2 text-sm text-[#b0b0b0] px-4 py-2 rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#0d0d14]/60"
              aria-label={`OWN platform handle @${own.handle} — profile link coming soon`}
            >
              <Globe className="h-4 w-4 text-[#D4AF37] shrink-0" aria-hidden />
              <span>
                OWN <span className="text-[#D4AF37]">@{own.handle}</span>
                <span className="text-[#8a8a8a]"> — link coming soon</span>
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Optional YouTube embed when a confirmed livestream embed URL is configured */}
      {ytEmbed ? (
        <div className="kingz-container mb-10" data-kingz-reveal>
          <div className="kingz-card overflow-hidden max-w-4xl mx-auto">
            <div className="aspect-video bg-[#050505]">
              <iframe
                src={ytEmbed}
                title="Kingz & Queenz YouTube livestream"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="kingz-container grid grid-cols-1 lg:grid-cols-2 gap-8">
        {KINGZ_SOCIAL_URLS.twitch ? (
          <div data-kingz-reveal className="kingz-card overflow-hidden">
            <div className="p-6 border-b border-[rgba(245,210,118,0.2)]">
              <h3 className="kingz-heading text-xl text-[#D4AF37] mb-2">Twitch</h3>
              <p className="text-[#d4d4d4] text-sm">Watch our live DJ sets and interactive broadcasts.</p>
            </div>
            <div className="aspect-video bg-[#050505] relative">
              {loadTwitch ? (
                <iframe
                  src={`https://player.twitch.tv/?channel=kingznqueenzent&parent=${parentDomain}&muted=true`}
                  title="Twitch stream — Kingz and Queenz Entertainment"
                  className="w-full h-full"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setLoadTwitch(true)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#5A2D91]/25 to-[#050505] text-[#f5f5f5] hover:from-[#5A2D91]/35 transition-colors touch-manipulation min-h-[44px]"
                  aria-label="Load Twitch player"
                >
                  <span className="p-4 rounded-full bg-[#D4AF37] text-[#050505]">
                    <Play className="h-7 w-7 fill-current" aria-hidden />
                  </span>
                  <span className="text-sm uppercase tracking-[0.2em] text-[#D4AF37]">Load live player</span>
                </button>
              )}
            </div>
            <div className="p-6">
              <a
                href={KINGZ_SOCIAL_URLS.twitch}
                {...externalLinkProps}
                className="kingz-btn-outline w-full inline-flex items-center justify-center min-h-11 touch-manipulation"
              >
                Follow on Twitch
              </a>
            </div>
          </div>
        ) : null}

        {KINGZ_SOCIAL_URLS.kick ? (
          <div data-kingz-reveal className="kingz-card overflow-hidden">
            <div className="p-6 border-b border-[rgba(245,210,118,0.2)]">
              <h3 className="kingz-heading text-xl text-[#D4AF37] mb-2">Kick</h3>
              <p className="text-[#d4d4d4] text-sm">Join the party on Kick — exclusive sets and community vibes.</p>
            </div>
            <div className="aspect-video bg-[#050505] flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-[#d4d4d4] mb-6">
                  Kick embed loads on their platform. Click below to watch live.
                </p>
                <a
                  href={KINGZ_SOCIAL_URLS.kick}
                  {...externalLinkProps}
                  className="kingz-btn-gold inline-flex items-center justify-center min-h-11 touch-manipulation"
                >
                  Watch on Kick
                </a>
              </div>
            </div>
            <div className="p-6">
              <a
                href={KINGZ_SOCIAL_URLS.kick}
                {...externalLinkProps}
                className="kingz-btn-outline w-full inline-flex items-center justify-center min-h-11 touch-manipulation"
              >
                Follow on Kick
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
