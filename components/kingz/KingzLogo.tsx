'use client'

import Image from 'next/image'
import { KINGZ_LOGO } from '@/lib/kingz/logo'

type KingzLogoProps = {
  /** Visual size preset — one DOM instance per placement */
  size?: 'nav' | 'footer' | 'hero'
  /**
   * Logo file variant.
   * ACTIVE: full | main → official crest `logo-main.png`
   * `transparent` maps to logo-transparent.png (same crest; still black-backed until a true alpha master exists)
   * Other keys are reserved for future official exports — do not invent artwork.
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
}

/**
 * Official Kingz & Queenz Entertainment crest.
 * Always preserves aspect ratio (object-contain). Never crops or stretches.
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
          size === 'hero'
            ? '(max-width: 640px) 200px, (max-width: 1024px) 280px, 360px'
            : size === 'footer'
              ? '88px'
              : '64px'
        }
        className="kingz-logo__img"
        style={{ objectFit: 'contain' }}
        quality={size === 'hero' ? 80 : 70}
      />
    </span>
  )
}
