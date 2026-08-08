'use client'

import { useEffect, useState } from 'react'

/**
 * Client media query hook.
 * Returns `null` until mounted so callers can avoid mobile/desktop layout flashes.
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])

  return matches
}
