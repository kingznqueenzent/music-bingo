'use client'

import Link from 'next/link'

/** Subtle footer link to the Supabase host login portal. */
export function StaffAccessFooterLink({
  from = '/host',
  className = 'text-xs text-slate-500 hover:text-[#00FFFF]/80 transition-colors',
}: {
  from?: string
  className?: string
}) {
  return (
    <Link href={`/login?from=${encodeURIComponent(from)}`} className={className}>
      Host Portal
    </Link>
  )
}
