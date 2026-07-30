'use client'

export type PlayerBoardStatus = {
  cardId: string
  playerName: string
  playerIdentifier: string | null
  markedCount: number
  target: number
  status: 'playing' | 'near_win' | 'bingo'
}

export type PlayerListPanelProps = {
  players: PlayerBoardStatus[]
  className?: string
}

export function PlayerListPanel({ players, className = '' }: PlayerListPanelProps) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-4 ${className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Players ({players.length})
      </h3>
      {players.length === 0 ? (
        <p className="text-slate-500 text-sm">Waiting for players to join…</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {players.map((p) => (
            <li
              key={p.cardId}
              className="flex items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 px-3 py-2.5"
            >
              <div className="w-9 h-9 rounded-full bg-[#00FFFF]/15 border border-[#00FFFF]/30 flex items-center justify-center text-sm font-bold text-[#00FFFF] shrink-0">
                {p.playerName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-100 font-medium truncate text-sm">{p.playerName}</p>
                <p className="text-slate-500 text-xs truncate font-mono">{p.cardId.slice(0, 8)}…</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[#00FFFF] font-bold text-sm tabular-nums">
                  {p.markedCount}/{p.target}
                </p>
                <p
                  className={`text-[10px] uppercase tracking-wide font-semibold ${
                    p.status === 'bingo'
                      ? 'text-[#FFD700]'
                      : p.status === 'near_win'
                        ? 'text-amber-400'
                        : 'text-slate-500'
                  }`}
                >
                  {p.status === 'bingo' ? 'BINGO!' : p.status === 'near_win' ? 'Close' : 'Playing'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
