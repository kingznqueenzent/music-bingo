'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export type ToastKind = 'success' | 'error'

export type ToastMessage = {
  id: number
  kind: ToastKind
  text: string
}

const AUTO_DISMISS_MS = 4000

export function useMediaManagerToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const showToast = useCallback((kind: ToastKind, text: string) => {
    setToast({ id: Date.now(), kind, text })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismissToast, AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [toast, dismissToast])

  return { toast, showToast, dismissToast }
}

export function MediaManagerToast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null
  onDismiss: () => void
}) {
  if (!toast) return null

  const isSuccess = toast.kind === 'success'

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] w-[min(100%-2rem,28rem)]"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
          isSuccess
            ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100'
            : 'border-red-500/40 bg-red-950/90 text-red-100'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
        ) : (
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
        )}
        <p className="flex-1 text-sm font-medium">{toast.text}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
