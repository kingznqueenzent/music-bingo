'use client'

import { ExternalLink } from 'lucide-react'
import { integrationHref, isIntegrationPlaceholder } from '@/lib/kingz/integrations'

type KingzIntegrationLinkProps = {
  href: string
  label: string
  className?: string
  variant?: 'gold' | 'outline' | 'purple' | 'glass'
  /** Shown when URL is still a placeholder */
  placeholderHint?: string
  ariaLabel?: string
}

const variantClass: Record<NonNullable<KingzIntegrationLinkProps['variant']>, string> = {
  gold: 'kingz-btn-gold',
  outline: 'kingz-btn-outline',
  purple: 'kingz-btn-purple',
  glass: 'kingz-btn-glass',
}

/**
 * External integration link — renders a real anchor when configured,
 * or a disabled placeholder button when the URL is still "#paste-...".
 */
export function KingzIntegrationLink({
  href,
  label,
  className = '',
  variant = 'gold',
  placeholderHint = 'Connect store link in lib/kingz/integrations.ts',
  ariaLabel,
}: KingzIntegrationLinkProps) {
  const resolved = integrationHref(href)
  const base = `${variantClass[variant]} ${className}`.trim()

  if (!resolved) {
    return (
      <button
        type="button"
        disabled
        className={`${base} opacity-60 cursor-not-allowed`}
        title={placeholderHint}
        aria-label={`${label} — ${placeholderHint}`}
      >
        {label}
        <span className="text-xs font-normal opacity-70">(Coming Soon)</span>
      </button>
    )
  }

  return (
    <a
      href={resolved}
      target="_blank"
      rel="noopener noreferrer"
      className={base}
      aria-label={ariaLabel ?? `${label} (opens in new tab)`}
    >
      {label}
      <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
    </a>
  )
}

type KingzScrollCtaProps = {
  label: string
  scrollTo: string
  variant?: 'gold' | 'outline' | 'purple' | 'glass'
  className?: string
}

/** Internal scroll CTA — for Book an Event, Shop Merch, etc. */
export function KingzScrollCta({
  label,
  scrollTo,
  variant = 'gold',
  className = '',
}: KingzScrollCtaProps) {
  const base = `${variantClass[variant]} ${className}`.trim()

  return (
    <button
      type="button"
      className={base}
      onClick={() => document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth' })}
    >
      {label}
    </button>
  )
}

type KingzCtaActionProps = {
  label: string
  href?: string
  scrollTo?: string
  variant?: 'gold' | 'outline' | 'purple' | 'glass'
  external?: boolean
  className?: string
}

/** Renders either scroll button or integration link based on action config. */
export function KingzCtaAction({ label, href, scrollTo, variant = 'gold', className }: KingzCtaActionProps) {
  if (scrollTo) {
    return <KingzScrollCta label={label} scrollTo={scrollTo} variant={variant} className={className} />
  }
  // Allow empty href → KingzIntegrationLink shows Coming Soon (e.g. Patreon)
  if (href !== undefined && href !== null) {
    return (
      <KingzIntegrationLink
        href={href}
        label={label}
        variant={variant}
        className={className}
        placeholderHint="Coming Soon — official link pending"
      />
    )
  }
  return null
}

export { isIntegrationPlaceholder }
