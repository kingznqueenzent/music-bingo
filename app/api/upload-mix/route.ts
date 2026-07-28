import { NextRequest } from 'next/server'
import { getMixApiBaseUrl, nextResponseFromUpstream } from '@/lib/mix-backend-proxy'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const upstream = await fetch(`${getMixApiBaseUrl()}/upload-mix`, {
    method: 'POST',
    body: formData,
  })
  return nextResponseFromUpstream(upstream)
}
