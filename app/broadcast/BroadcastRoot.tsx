'use client'

import { useEffect } from 'react'

/** Opaque, no-scroll Meld canvas for /broadcast (not the transparent /overlay source). */
export function BroadcastRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyMinH = body.style.minHeight

    html.classList.add('broadcast-route')
    body.classList.add('broadcast-route')
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.minHeight = '0'

    return () => {
      html.classList.remove('broadcast-route')
      body.classList.remove('broadcast-route')
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.minHeight = prevBodyMinH
    }
  }, [])

  return <>{children}</>
}
