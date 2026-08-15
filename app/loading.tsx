/** Default loading UI for LyricGrid product routes. Kingz routes use (kingz)/layout styling. */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-slate-950 flex items-center justify-center text-white">
      <div className="text-center">
        <div
          className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-[#00FF66] border-t-transparent mb-4"
          aria-hidden
        />
        <p className="text-slate-400 text-sm tracking-wide">Loading…</p>
      </div>
    </div>
  )
}
