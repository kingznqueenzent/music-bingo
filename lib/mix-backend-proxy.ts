import { NextResponse } from 'next/server'

/**
 * Optional FastAPI routes: **Next.js → `/api/*` → upstream**
 *
 * The browser only talks to the Next.js origin. These App Router handlers forward
 * to the Python API (`MIX_API_URL`). CORS stays same-origin; secrets stay server-side.
 *
 * | Next.js route                 | FastAPI                          |
 * |------------------------------|----------------------------------|
 * | `POST /api/upload-mix`        | `POST /upload-mix`               |
 * | `POST /api/analyze-mix/[id]`  | `POST /analyze-mix/{id}`          |
 * | `GET  /api/mix-report/[id]`   | `GET  /mix-report/{id}`          |
 * | `GET  /api/mix-status/[id]`   | `GET  /mix-status/{id}`          |
 * | `GET  /api/mix-outcome/[id]`  | `GET  /mix-outcome/{id}`         |
 *
 * Other `/api/*` routes (bingo, Supabase, YouTube imports, …) are implemented in
 * Next.js and do **not** go to FastAPI.
 *
 * If the browser sets **`NEXT_PUBLIC_API_URL`**, the client skips these routes and calls
 * FastAPI directly (see `lib/mix-analyzer-endpoints.ts`); enable CORS on the API.
 */
export function getMixApiBaseUrl(): string {
  return (process.env.MIX_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')
}

export async function nextResponseFromUpstream(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
    },
  })
}
