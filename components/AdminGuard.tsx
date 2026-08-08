'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export function AdminGuard({
  children,
  redirectTo = '/login',
  from,
}: {
  children: React.ReactNode
  redirectTo?: string
  from?: string
}) {
  const router = useRouter()
  const { isAdmin, loading, ready } = useIsAdmin()
  const redirected = useRef(false)

  useEffect(() => {
    // Only redirect after a settled negative result — never during loading/revalidation.
    if (loading || !ready || isAdmin || redirected.current) return
    redirected.current = true
    const qs = from ? `?from=${encodeURIComponent(from)}` : ''
    router.replace(`${redirectTo}${qs}`)
  }, [isAdmin, loading, ready, redirectTo, from, router])

  if (loading || !ready) {
    return (
      <div className="min-h-[40dvh] flex items-center justify-center text-slate-400 text-sm">
        Checking access…
      </div>
    )
  }

  if (!isAdmin) return null

  return <>{children}</>
}
