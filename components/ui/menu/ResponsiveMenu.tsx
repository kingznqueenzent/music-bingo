'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import { motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { MENU_MD_QUERY, MENU_TOKENS } from '@/components/ui/menu/tokens'

export type ResponsiveMenuProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Anchor for desktop floating popover. */
  anchorRef?: RefObject<HTMLElement | null>
  /** Desktop placement preference. */
  placement?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start' | 'bottom' | 'top'
  /** Desktop panel width class. */
  desktopWidthClass?: string
  /** Optional footer (e.g. actions). */
  footer?: ReactNode
  /** Accessible role — dialog for nav sheets, listbox for pickers. */
  role?: 'dialog' | 'listbox'
  /** Force mobile bottom-sheet even on desktop. */
  forceSheet?: boolean
}

/**
 * Unified LyricGrid menu surface:
 * - Mobile: bottom-sheet slide-over + frosted backdrop + scroll lock
 * - Desktop: Floating UI popover with flip/shift boundary awareness
 *
 * Close is instant (no exit animation) so route transitions never leave a
 * portaled sheet flashing over the next page (Media Manager, etc.).
 */
export function ResponsiveMenu({
  open,
  onClose,
  title,
  description,
  children,
  anchorRef,
  placement = 'bottom-end',
  desktopWidthClass = 'w-[22rem]',
  footer,
  role = 'dialog',
  forceSheet = false,
}: ResponsiveMenuProps) {
  const titleId = useId()
  const isDesktop = useMediaQuery(MENU_MD_QUERY)
  const layoutReady = forceSheet || isDesktop !== null
  const usePopover = Boolean(layoutReady && isDesktop && !forceSheet && anchorRef)
  const reduceMotion = useReducedMotion()
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const portalIdRef = useRef(`lyric-menu-${Math.random().toString(36).slice(2)}`)

  // Sheet mode only — desktop popovers must not freeze page scroll.
  useBodyScrollLock(open && layoutReady && !usePopover)

  const { refs, floatingStyles, context } = useFloating({
    open: open && usePopover,
    onOpenChange: (next) => {
      if (!next) onClose()
    },
    placement,
    strategy: 'fixed',
    middleware: [
      offset(10),
      flip({ padding: 12, fallbackAxisSideDirection: 'start' }),
      shift({ padding: 12 }),
      size({
        padding: 12,
        apply({ availableHeight, availableWidth, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(availableHeight, 576)}px`,
            width: `${Math.min(Math.max(availableWidth, 256), 352)}px`,
          })
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  })

  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true })
  const floatingRole = useRole(context, { role: role === 'listbox' ? 'listbox' : 'dialog' })
  const { getFloatingProps } = useInteractions([dismiss, floatingRole])

  useLayoutEffect(() => {
    if (!open || !usePopover || !anchorRef?.current) return
    refs.setReference(anchorRef.current)
  }, [open, usePopover, anchorRef, refs])

  // Escape for sheet mode; desktop popover uses Floating UI useDismiss.
  useEffect(() => {
    if (!open || usePopover) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, usePopover, onClose])

  useEffect(() => {
    if (!open || usePopover || !layoutReady) return
    const t = window.setTimeout(() => closeBtnRef.current?.focus({ preventScroll: true }), 0)
    return () => window.clearTimeout(t)
  }, [open, usePopover, layoutReady])

  // Hard cleanup: remove any orphaned portal nodes if this instance unmounts mid-nav.
  useEffect(() => {
    const id = portalIdRef.current
    return () => {
      document.getElementById(id)?.remove()
    }
  }, [])

  if (typeof document === 'undefined') return null

  // Instant unmount when closed — never leave AnimatePresence exit over the next route.
  if (!open || !layoutReady) return null

  const header = (
    <div className="flex items-start justify-between gap-3 px-1 pb-3 mb-1 border-b border-white/10 shrink-0">
      <div className="min-w-0 pt-0.5">
        <p id={titleId} className={MENU_TOKENS.titleClass}>
          {title}
        </p>
        {description ? (
          <p className={`${MENU_TOKENS.subtitleClass} mt-0.5 truncate`}>{description}</p>
        ) : null}
      </div>
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        className="inline-flex items-center justify-center min-h-12 min-w-12 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-[#00FFFF]/40 hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation shrink-0"
        aria-label="Close menu"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )

  return createPortal(
    <div
      id={portalIdRef.current}
      className="fixed inset-0"
      style={{ zIndex: MENU_TOKENS.zOverlay }}
      data-lyric-menu="open"
    >
      <button
        type="button"
        aria-label="Close menu"
        className="lyric-menu-backdrop absolute inset-0 border-0 cursor-default"
        onClick={onClose}
      />

      {usePopover ? (
        <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
          <motion.div
            ref={refs.setFloating}
            style={{ ...floatingStyles, zIndex: MENU_TOKENS.zPanel }}
            {...getFloatingProps({
              className: [
                desktopWidthClass,
                'flex flex-col overflow-hidden rounded-2xl border border-white/10',
                'bg-[#1A1A1A] shadow-2xl shadow-black/50',
                'origin-top-right',
              ].join(' '),
              'aria-labelledby': titleId,
            })}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col min-h-0 max-h-[inherit] p-3">
              {header}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                {children}
              </div>
              {footer ? (
                <div className="pt-2 border-t border-white/10 shrink-0">{footer}</div>
              ) : null}
            </div>
          </motion.div>
        </FloatingFocusManager>
      ) : (
        <motion.div
          role={role}
          aria-modal="true"
          aria-labelledby={titleId}
          className={[
            'absolute inset-x-0 bottom-0 flex flex-col',
            'max-h-[min(88dvh,40rem)] rounded-t-2xl border border-white/10 border-b-0',
            'bg-[#1A1A1A] shadow-2xl shadow-black/60',
            'pt-2 px-3',
            'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          ].join(' ')}
          style={{ zIndex: MENU_TOKENS.zPanel }}
          initial={reduceMotion ? false : { y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 32, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pb-2 shrink-0" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-white/20" />
          </div>
          {header}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">{children}</div>
          {footer ? (
            <div className="pt-2 border-t border-white/10 shrink-0">{footer}</div>
          ) : null}
        </motion.div>
      )}
    </div>,
    document.body
  )
}
