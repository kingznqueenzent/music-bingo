/** ISO 8601 week string e.g. 2026-W15 for streak / last_played_week */

export function getISOWeekString(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  const y = d.getUTCFullYear()
  return `${y}-W${String(weekNo).padStart(2, '0')}`
}

/** Monday 00:00 UTC of the ISO week containing `date` */
function mondayOfWeekContaining(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - (day - 1))
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** Returns true if `current` is the ISO week immediately after `previous` (handles year boundaries). */
export function isConsecutiveISOWeek(previous: string | null | undefined, current: string): boolean {
  if (!previous || previous === current) return false
  const p = parseISOWeekString(previous)
  const c = parseISOWeekString(current)
  if (!p || !c) return false
  const pMon = mondayOfISOWeek(p.year, p.week)
  const nextMonday = new Date(pMon.getTime() + 7 * 24 * 60 * 60 * 1000)
  const cMon = mondayOfISOWeek(c.year, c.week)
  return nextMonday.getTime() === cMon.getTime()
}

function parseISOWeekString(s: string): { year: number; week: number } | null {
  const m = s.trim().match(/^(\d{4})-W(\d{1,2})$/)
  if (!m) return null
  return { year: parseInt(m[1], 10), week: parseInt(m[2], 10) }
}

/** Monday 00:00 UTC of ISO week (year, week) */
function mondayOfISOWeek(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const mondayWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 24 * 60 * 60 * 1000)
  return new Date(mondayWeek1.getTime() + (isoWeek - 1) * 7 * 24 * 60 * 60 * 1000)
}
