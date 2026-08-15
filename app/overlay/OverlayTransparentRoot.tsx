'use client'

import { useEffect } from 'react'

/** Forces html/body transparency for browser-source overlays (OBS, Meld Studio, etc.). */
export function OverlayTransparentRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlBg = html.style.background
    const prevBodyBg = body.style.background
    const prevBodyMinH = body.style.minHeight

    html.style.background = 'transparent'
    body.style.background = 'transparent'
    body.style.minHeight = '0'

    html.classList.add('overlay-route')
    body.classList.add('overlay-route')

    return () => {
      html.style.background = prevHtmlBg
      body.style.background = prevBodyBg
      body.style.minHeight = prevBodyMinH
      html.classList.remove('overlay-route')
      body.classList.remove('overlay-route')
    }
  }, [])

  return <>{children}</>
}
