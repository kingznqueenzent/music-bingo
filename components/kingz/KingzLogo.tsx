'use client'

import Image from 'next/image'
import { KINGZ_LOGO } from '@/lib/kingz/logo'

type KingzLogoProps = {
  /** Visual size preset */
  size?: 'nav' | 'footer' | 'hero' | 'mobile-hero'
  /**
   * Logo file variant.
   * ACTIVE: full | main | transparent
   * PLACEHOLDERS (add files later): white | gold | black | horizontal | compact | monogram | crown
   */
  variant?: 'full' | 'main' | 'transparent' | 'white' | 'gold' | 'black' | 'horizontal' | 'compact' | 'monogram' | 'crown'
  className?: string
  priority?: boolean
  lazy?: boolean
}

const SIZE_CLASS: Record<NonNullable<KingzLogoProps['size']>, string> = {
  nav: 'kingz-logo--nav',
  footer: 'kingz-logo--footer',
  hero: 'kingz-logo--hero',
  'mobile-hero': 'kingz-logo--mobile-hero',
}

/**
 * Official Kingz & Queenz logo.
 * Always preserves aspect ratio (object-contain). Never crops or stretches.
 *
 * ACTIVE: logo-main.png / logo-transparent.png via KINGZ_LOGO.main
 * FUTURE variants (white, gold, black, horizontal, compact, monogram, crown):
 *   Drop files in public/assets/logo/ and switch `variant` prop when ready.
 */
export function KingzLogo({
  size = 'nav',
  variant = 'full',
  className = '',
  priority = false,
  lazy,
}: KingzLogoProps) {
  const src =
    variant === 'transparent'
      ? KINGZ_LOGO.transparent
      : variant === 'white'
        ? KINGZ_LOGO.white
        : variant === 'gold'
          ? KINGZ_LOGO.gold
          : variant === 'black'
            ? KINGZ_LOGO.black
            : variant === 'horizontal'
              ? KINGZ_LOGO.horizontal
              : variant === 'compact'
                ? KINGZ_LOGO.compact
                : variant === 'monogram'
                  ? KINGZ_LOGO.monogram
                  : variant === 'crown'
                    ? KINGZ_LOGO.crown
                    : KINGZ_LOGO.main

  const useLazy = lazy ?? !priority

  return (
    <span className={`kingz-logo ${SIZE_CLASS[size]} ${className}`.trim()}>
      <Image
        src={src}
        alt={KINGZ_LOGO.alt}
        width={KINGZ_LOGO.width}
        height={KINGZ_LOGO.height}
        priority={priority}
        loading={priority ? undefined : useLazy ? 'lazy' : undefined}
        sizes={
          size === 'hero' || size === 'mobile-hero'
            ? '(max-width: 640px) 220px, (max-width: 1024px) 320px, 420px'
            : size === 'footer'
              ? '120px'
              : '140px'
        }
        className="kingz-logo__img"
        // Preserve exact aspect ratio — never crop
        style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
      />
    </span>
  )
}
