'use client'

import { useLayoutEffect, useRef } from 'react'

/** Nested scroll-lock counter so overlapping menus don't restore scroll early. */
let lockCount = 0
let savedScrollY = 0

function applyBodyLock() {
  const { body } = document
  if (lockCount === 0) {
    savedScrollY = window.scrollY
    body.dataset.lyricScrollLock = '1'
    body.style.position = 'fixed'
    body.style.top = `-${savedScrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
  }
  lockCount += 1
}

function releaseBodyLock() {
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount > 0) return

  const { body } = document
  body.style.position = ''
  body.style.top = ''
  body.style.width = ''
  body.style.overflow = ''
  delete body.dataset.lyricScrollLock
  window.scrollTo(0, savedScrollY)
}

/** Lock document scroll while `locked` is true without iOS jump-flash. Ref-counted. */
export function useBodyScrollLock(locked: boolean) {
  const wasLocked = useRef(false)

  useLayoutEffect(() => {
    if (locked && !wasLocked.current) {
      applyBodyLock()
      wasLocked.current = true
    } else if (!locked && wasLocked.current) {
      releaseBodyLock()
      wasLocked.current = false
    }

    return () => {
      if (wasLocked.current) {
        releaseBodyLock()
        wasLocked.current = false
      }
    }
  }, [locked])
}
