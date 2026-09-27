'use client'

import {
  AUTOPILOT_DELAYS,
  AUTOPILOT_RUNTIMES,
  formatClock,
  phaseFromState,
  runtimeLabel,
  type AutopilotDelaySec,
  type AutopilotMode,
  type AutopilotPersisted,
  type AutopilotRuntime,
  type AutopilotWinnerPolicy,
} from '@/lib/autopilot'

export type AutopilotConnection = 'connected' | 'connecting' | 'disconnected'

export type HostAutopilotPanelProps = {
  state: AutopilotPersisted
  connection: AutopilotConnection
  currentTrackLabel: string
  calledCount: number
  remainingCount: number
  elapsedSec: number
  remainingRuntimeSec: number | null
  nextActionCountdown: number | null
  bingoApprovalRequired: boolean
  starting?: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onModeChange: (mode: AutopilotMode) => void
  onRuntimeChange: (runtime: AutopilotRuntime) => void
  onDelayChange: (delay: AutopilotDelaySec) => void
  onWinnerPolicyChange: (policy: AutopilotWinnerPolicy) => void
  className?: string
}

function phaseLabel(state: AutopilotPersisted): string {
  const phase = phaseFromState(state)
  if (phase === 'complete') return 'AUTOPILOT COMPLETE'
  if (phase === 'active') return 'ACTIVE'
  if (phase === 'paused') return 'PAUSED'
  if (phase === 'stopped') return 'STOPPED'
  return 'IDLE'
}

function connectionLabel(connection: AutopilotConnection): string {
  if (connection === 'connected') return 'Connected'
  if (connection === 'connecting') return 'Connecting…'
  return 'Disconnected — paused'
}

export function HostAutopilotPanel({
  state,
  connection,
  currentTrackLabel,
  calledCount,
  remainingCount,
  elapsedSec,
  remainingRuntimeSec,
  nextActionCountdown,
  bingoApprovalRequired,
  starting = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onModeChange,
  onRuntimeChange,
  onDelayChange,
  onWinnerPolicyChange,
  className = '',
}: HostAutopilotPanelProps) {
  const phase = phaseFromState(state)
  const running = phase === 'active'
  const paused = phase === 'paused'
  const idle = phase === 'idle' || phase === 'stopped' || phase === 'complete'
  const settingsLocked = running || paused

  return (
    <section
      className={`rounded-2xl border border-[#00FF66]/30 bg-[#0b1610]/90 p-4 sm:p-5 ${className}`}
      aria-label="Autopilot"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[#00FF66]/90">
            Autopilot
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Unattended calls use the same Next Track engine. PC must stay awake, powered, and
            networked. Windows sleep will stop Autopilot.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
            phase === 'active'
              ? 'bg-[#00FF66] text-[#121212]'
              : phase === 'complete'
                ? 'bg-amber-400 text-[#121212]'
                : phase === 'paused'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  : 'bg-slate-800 text-slate-300'
          }`}
        >
          {phaseLabel(state)}
        </span>
      </div>

      {bingoApprovalRequired ? (
        <p className="mb-3 rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
          HOST APPROVAL REQUIRED — Autopilot paused on bingo claim. Do not auto-advance until you
          resolve the claim.
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
        <label className="space-y-1">
          <span className="text-slate-400 text-xs uppercase tracking-wide">Mode</span>
          <select
            value={state.mode}
            disabled={settingsLocked}
            onChange={(e) => onModeChange(e.target.value === 'random' ? 'random' : 'continue')}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 disabled:opacity-50"
          >
            <option value="continue">CONTINUE (playlist order, after called)</option>
            <option value="random">RANDOM (remaining uncalled only)</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-slate-400 text-xs uppercase tracking-wide">Runtime</span>
          <select
            value={String(state.runtime)}
            disabled={settingsLocked}
            onChange={(e) => {
              const v = e.target.value
              onRuntimeChange(v === 'until_end' ? 'until_end' : (Number(v) as AutopilotRuntime))
            }}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 disabled:opacity-50"
          >
            {AUTOPILOT_RUNTIMES.map((r) => (
              <option key={String(r)} value={String(r)}>
                {runtimeLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-slate-400 text-xs uppercase tracking-wide">Delay between calls</span>
          <select
            value={state.delaySec}
            disabled={settingsLocked}
            onChange={(e) => onDelayChange(Number(e.target.value) as AutopilotDelaySec)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 disabled:opacity-50"
          >
            {AUTOPILOT_DELAYS.map((d) => (
              <option key={d} value={d}>
                {d}s{d === 10 ? ' (safe default)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block mb-4 space-y-1">
        <span className="text-slate-400 text-xs uppercase tracking-wide">After a verified winner</span>
        <select
          value={state.winnerPolicy}
          disabled={settingsLocked}
          onChange={(e) => onWinnerPolicyChange(e.target.value as AutopilotWinnerPolicy)}
          className="w-full sm:w-auto rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 disabled:opacity-50"
        >
          <option value="pause">PAUSE ON WINNER (default)</option>
          <option value="continue">CONTINUE AFTER WINNER</option>
          <option value="end_game">END GAME after winner</option>
        </select>
      </label>

      <div className="flex flex-wrap gap-2 mb-4">
        {idle ? (
          <button
            type="button"
            onClick={onStart}
            disabled={starting || remainingCount === 0}
            className="rounded-full bg-[#00FF66] hover:bg-[#00FF66]/90 disabled:opacity-40 text-[#121212] font-bold px-5 py-2.5 text-sm min-h-[44px]"
          >
            {starting ? 'Starting…' : 'START AUTOPILOT'}
          </button>
        ) : null}
        {running ? (
          <button
            type="button"
            onClick={onPause}
            className="rounded-full bg-amber-500 hover:bg-amber-400 text-[#121212] font-bold px-5 py-2.5 text-sm min-h-[44px]"
          >
            PAUSE
          </button>
        ) : null}
        {paused && !state.complete ? (
          <button
            type="button"
            onClick={onResume}
            disabled={connection === 'disconnected' || bingoApprovalRequired}
            className="rounded-full bg-[#00FF66] hover:bg-[#00FF66]/90 disabled:opacity-40 text-[#121212] font-bold px-5 py-2.5 text-sm min-h-[44px]"
          >
            RESUME
          </button>
        ) : null}
        {!idle || state.complete ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-full border border-slate-500 hover:border-slate-300 text-slate-100 font-semibold px-5 py-2.5 text-sm min-h-[44px]"
          >
            STOP
          </button>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs text-slate-400">
        <div>
          <dt className="uppercase tracking-wide">Mode</dt>
          <dd className="text-slate-100 font-semibold">{state.mode.toUpperCase()}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Runtime target</dt>
          <dd className="text-slate-100 font-semibold">{runtimeLabel(state.runtime)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Elapsed</dt>
          <dd className="text-slate-100 font-semibold tabular-nums">{formatClock(elapsedSec)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Remaining</dt>
          <dd className="text-slate-100 font-semibold tabular-nums">
            {remainingRuntimeSec == null ? 'Until game ends' : formatClock(remainingRuntimeSec)}
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="uppercase tracking-wide">Current track</dt>
          <dd className="text-slate-100 font-semibold truncate" title={currentTrackLabel}>
            {currentTrackLabel || '—'}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Called / remaining</dt>
          <dd className="text-slate-100 font-semibold tabular-nums">
            {calledCount} / {remainingCount}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Next action</dt>
          <dd className="text-emerald-300 font-semibold tabular-nums">
            {running && nextActionCountdown != null ? `${nextActionCountdown}s` : '—'}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Connection</dt>
          <dd
            className={`font-semibold ${
              connection === 'connected'
                ? 'text-emerald-400'
                : connection === 'connecting'
                  ? 'text-amber-300'
                  : 'text-red-400'
            }`}
          >
            {connectionLabel(connection)}
          </dd>
        </div>
      </dl>
    </section>
  )
}
