import { NextResponse } from 'next/server'

import { getMixApiBaseUrl, nextResponseFromUpstream } from '@/lib/mix-backend-proxy'

type RouteContext = { params: Promise<{ mixId: string }> }

export async function GET(_req: Request, context: RouteContext) {
  const { mixId } = await context.params
  const upstream = await fetch(
    `${getMixApiBaseUrl()}/mix-outcome/${encodeURIComponent(mixId)}`,
    { cache: 'no-store' },
  )
  return await nextResponseFromUpstream(upstream)
}
