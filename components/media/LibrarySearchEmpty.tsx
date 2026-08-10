'use client'

type LibrarySearchEmptyProps = {
  query: string
  onClear: () => void
  message?: string
  className?: string
}

/** Shared empty state when library search/filters yield no matches. */
export function LibrarySearchEmpty({
  query,
  onClear,
  message = 'No tracks match your search.',
  className = '',
}: LibrarySearchEmptyProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-4 py-10 text-center ${className}`}
      role="status"
    >
      <p className="text-slate-400 text-sm max-w-sm">
        {query.trim() ? (
          <>
            {message}{' '}
            <span className="text-slate-200 font-medium">“{query.trim()}”</span>
          </>
        ) : (
          message
        )}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="min-h-11 rounded-full border border-[#00FF66]/40 px-5 py-2 text-sm font-semibold text-[#00FF66] hover:bg-[#00FF66]/10 touch-manipulation"
      >
        Clear search & filters
      </button>
    </div>
  )
}
