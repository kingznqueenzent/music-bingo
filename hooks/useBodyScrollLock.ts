'use client'

import { useEffect, useRef } from 'react'

/** Lock document scroll while `locked` is true without iOS jump-flash. */
export function useBodyScrollLock(locked: boolean) {
  const scrollYRef = useRef(0)

  useEffect(() => {
    if (!locked) return

    scrollYRef.current = window.scrollY
    const { body } = document
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollYRef.current}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, scrollYRef.current)
    }
  }, [locked])
}
