'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Total time on screen before removal; last `SHOUT_FADE_MS` is fade-out. */
export const SHOUT_DISPLAY_MS = 5000
export const SHOUT_FADE_MS = 500
const SHOUT_FULL_OPACITY_MS = SHOUT_DISPLAY_MS - SHOUT_FADE_MS

export type AutoDismissItem<T extends object> = T & { id: string; fading: boolean }

/**
 * Queue of floating messages: each entry auto-removes after {@link SHOUT_DISPLAY_MS}
 * with a fade for the last {@link SHOUT_FADE_MS}. Keeps at most `maxItems` (oldest dropped when full).
 */
export function useAutoDismissStack<T extends object>(maxItems: number) {
  const [items, setItems] = useState<AutoDismissItem<T>[]>([])
  const timersRef = useRef<
    Map<string, { fade: ReturnType<typeof setTimeout>; remove: ReturnType<typeof setTimeout> }>
  >(new Map())

  const push = useCallback(
    (data: T) => {
      const id =
        typeof globalThis.crypto?.randomUUID === 'function'
          ? globalThis.crypto.randomUUID()
          : `shout-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

      setItems((prev) => {
        let next: AutoDismissItem<T>[] = [...prev, { ...data, id, fading: false } as AutoDismissItem<T>]
        while (next.length > maxItems) {
          const dropped = next.shift()!
          const tm = timersRef.current.get(dropped.id)
          if (tm) {
            clearTimeout(tm.fade)
            clearTimeout(tm.remove)
            timersRef.current.delete(dropped.id)
          }
        }
        return next
      })

      const fade = setTimeout(() => {
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, fading: true } : x)))
      }, SHOUT_FULL_OPACITY_MS)

      const remove = setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id))
        timersRef.current.delete(id)
      }, SHOUT_DISPLAY_MS)

      timersRef.current.set(id, { fade, remove })
    },
    [maxItems]
  )

  const dismiss = useCallback((id: string) => {
    const tm = timersRef.current.get(id)
    if (tm) {
      clearTimeout(tm.fade)
      clearTimeout(tm.remove)
      timersRef.current.delete(id)
    }
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    timersRef.current.forEach((tm) => {
      clearTimeout(tm.fade)
      clearTimeout(tm.remove)
    })
    timersRef.current.clear()
    setItems([])
  }, [])

  useEffect(
    () => () => {
      timersRef.current.forEach((tm) => {
        clearTimeout(tm.fade)
        clearTimeout(tm.remove)
      })
    },
    []
  )

  return { items, push, dismiss, clearAll }
}
