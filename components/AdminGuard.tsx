'use client'

import { useEffect } from 'react'
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
  const { isAdmin, loading } = useIsAdmin()

  useEffect(() => {
    if (loading) return
    if (!isAdmin) {
      const qs = from ? `?from=${encodeURIComponent(from)}` : ''
      router.replace(`${redirectTo}${qs}`)
    }
  }, [isAdmin, loading, redirectTo, from, router])

  if (loading) {
    return (
      <div className="min-h-[40dvh] flex items-center justify-center text-slate-400 text-sm">
        Checking access…
      </div>
    )
  }

  if (!isAdmin) return null

  return <>{children}</>
}
