'use client'

import { useEffect, type ReactNode } from 'react'

type StageOverlayRootProps = {
  transparent: boolean
  children: ReactNode
}

/** Applies html/body canvas styles for OBS Browser Source or venue TV. */
export function StageOverlayRoot({ transparent, children }: StageOverlayRootProps) {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlBg = html.style.background
    const prevBodyBg = body.style.background
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyMinH = body.style.minHeight

    html.classList.add('stage-overlay-route')
    body.classList.add('stage-overlay-route')
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.minHeight = '0'

    if (transparent) {
      html.classList.add('stage-overlay-transparent')
      body.classList.add('stage-overlay-transparent')
      html.style.background = 'transparent'
      body.style.background = 'transparent'
    } else {
      html.classList.remove('stage-overlay-transparent')
      body.classList.remove('stage-overlay-transparent')
      html.style.background = '#050805'
      body.style.background = '#050805'
    }

    return () => {
      html.classList.remove('stage-overlay-route', 'stage-overlay-transparent')
      body.classList.remove('stage-overlay-route', 'stage-overlay-transparent')
      html.style.background = prevHtmlBg
      body.style.background = prevBodyBg
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.minHeight = prevBodyMinH
    }
  }, [transparent])

  return <>{children}</>
}
