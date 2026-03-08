import { LyricGridLogo } from '@/components/LyricGridLogo'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 flex flex-col items-center text-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <LyricGridLogo size={72} className="shrink-0 text-[#00FFFF]" />
          <p className="text-sm uppercase tracking-[0.2em] text-[#00FFFF]/90">
            ✨ Interactive Music Entertainment
          </p>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
          <span className="block text-slate-100">LyricGrid</span>
          <span className="block bg-gradient-to-r from-[#00FFFF] via-cyan-300 to-teal-300 bg-clip-text text-transparent mt-1">
            Music Bingo for Livestreams
          </span>
        </h1>
        <p className="max-w-2xl text-slate-300 text-base md:text-lg">
          Turn your favorite songs into an unforgettable bingo experience.
          Join with a game code, play with friends, and compete on the global leaderboard.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <a
            href="/join"
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 px-8 py-3 text-lg font-semibold shadow-xl shadow-emerald-500/40 transition-transform hover:scale-105"
          >
            Join a Game
          </a>
          <a
            href="/playlists"
            className="inline-flex items-center justify-center rounded-full border border-slate-600/80 px-8 py-3 text-lg font-semibold text-slate-100 hover:border-slate-300 hover:bg-slate-900/60 transition-colors"
          >
            Browse Playlists
          </a>
          <a
            href="/leaderboard"
            className="inline-flex items-center justify-center rounded-full border border-amber-500/60 px-8 py-3 text-lg font-semibold text-amber-200 hover:border-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            Leaderboard
          </a>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 max-w-md text-sm sm:text-base">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 px-4 py-3">
            <div className="text-2xl font-bold text-emerald-300">100+</div>
            <div className="text-slate-300 text-xs sm:text-sm">
              Concurrent Players
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 px-4 py-3">
            <div className="text-2xl font-bold text-sky-300">25</div>
            <div className="text-slate-300 text-xs sm:text-sm">
              Tracks per Card
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 px-4 py-3">
            <div className="text-2xl font-bold text-violet-300">∞</div>
            <div className="text-slate-300 text-xs sm:text-sm">
              Fun Factor
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
          Why Choose Music Bingo?
        </h2>
        <p className="text-center text-slate-300 mb-10 max-w-2xl mx-auto">
          Everything you need for the ultimate interactive music experience.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Custom Playlists"
            body="Upload your favorite songs and generate unique 5×5 bingo cards for every player."
          />
          <FeatureCard
            title="Real-Time Multiplayer"
            body="Instant card updates, live player counts, and synchronized song playback."
          />
          <FeatureCard
            title="Global Leaderboard"
            body="Track wins, streaks, and achievements across all your games."
          />
          <FeatureCard
            title="Instant Setup"
            body="Generate a 6‑digit code and go from zero to live game in minutes."
          />
          <FeatureCard
            title="Multi-Platform Streaming"
            body="Built for Twitch, Kick, YouTube, TikTok, and more. OBS‑friendly overlays."
          />
          <FeatureCard
            title="DMCA Friendly Clips"
            body="Short music snippets keep things safe for streams and public events."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800/80 bg-slate-950/60">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-50">
              Ready to Play?
            </h3>
            <p className="text-slate-300 mt-2 max-w-xl">
              Get the game code from your host or stream, then join and play
              along with your bingo card.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/join"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 px-6 py-3 font-semibold shadow-lg shadow-emerald-500/40 transition-transform hover:scale-105"
            >
              Join a Game
            </a>
            <a
              href="/leaderboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 font-semibold text-slate-100 hover:border-slate-300 hover:bg-slate-900/60 transition-colors"
            >
              Leaderboard
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-md shadow-black/40">
      <h3 className="text-lg font-semibold mb-2 text-slate-50">{title}</h3>
      <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
    </div>
  )
}