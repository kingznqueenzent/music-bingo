import { getMixApiBaseUrl, nextResponseFromUpstream } from '@/lib/mix-backend-proxy'

type RouteContext = { params: Promise<{ mixId: string }> }

export async function POST(_req: Request, context: RouteContext) {
  const { mixId } = await context.params
  const id = encodeURIComponent(mixId)
  const upstream = await fetch(`${getMixApiBaseUrl()}/analyze-mix/${id}`, {
    method: 'POST',
  })
  return nextResponseFromUpstream(upstream)
}
