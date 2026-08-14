'use client'

type RandomShuffleToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}

/** Prominent toggle for randomizing playlist queue order before cards are dealt. */
export function RandomShuffleToggle({ checked, onChange, className = '' }: RandomShuffleToggleProps) {
  return (
    <div
      className={`rounded-xl border border-[#00FF66]/25 bg-[#00FF66]/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#00FF66]">Random Shuffle</p>
        <p className="text-xs text-white/50 mt-0.5">
          Shuffle song queue order before dealing bingo cards. Off keeps your list order.
        </p>
      </div>
      <label className="flex items-center gap-2 cursor-pointer shrink-0">
        <span className="sr-only">Random shuffle playlist order</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors touch-manipulation ${
            checked ? 'bg-[#00FF66]' : 'bg-white/20'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow ring-0 transition translate-y-0.5 ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </label>
    </div>
  )
}
