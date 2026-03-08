export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-[#00FFFF] border-t-transparent mb-4" />
        <p className="text-slate-400">Loading LyricGrid…</p>
      </div>
    </div>
  )
}
