import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { VenuePackagesForm } from './VenuePackagesForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VenuePackagesPage() {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'venue_packages'))) {
    notFound()
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">
          Venue packages
        </h1>
        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Choose a plan that fits your room size and how often you run LyricGrid. Submit a booking request and our team
          will confirm details.
        </p>
        <VenuePackagesForm />
        <p className="mt-12 text-center">
          <Link href="/lyricgrid" className="text-slate-400 hover:text-white">
            ← Home
          </Link>
        </p>
      </div>
    </main>
  )
}
