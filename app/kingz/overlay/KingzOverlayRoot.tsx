'use client'

import { useEffect } from 'react'

/** Forces html/body transparency for Kingz OBS / Meld browser sources. */
export function KingzOverlayRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlBg = html.style.background
    const prevBodyBg = body.style.background
    const prevBodyMinH = body.style.minHeight

    html.style.background = 'transparent'
    body.style.background = 'transparent'
    body.style.minHeight = '0'

    html.classList.add('kingz-overlay-route')
    body.classList.add('kingz-overlay-route')

    return () => {
      html.style.background = prevHtmlBg
      body.style.background = prevBodyBg
      body.style.minHeight = prevBodyMinH
      html.classList.remove('kingz-overlay-route')
      body.classList.remove('kingz-overlay-route')
    }
  }, [])

  return <>{children}</>
}
