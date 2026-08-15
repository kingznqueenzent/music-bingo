/** Kingz marketing route loading UI (gold brand). */
export default function KingzLoading() {
  return (
    <div className="min-h-dvh bg-[#050505] flex items-center justify-center text-white">
      <div className="text-center">
        <div
          className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent mb-4"
          aria-hidden
        />
        <p className="text-[#b0b0b0] text-sm tracking-wide">Loading...</p>
      </div>
    </div>
  )
}
