/** Basic word filter — host can disable per game via `chat_profanity_filter_enabled`. */
const BLOCKED = new Set([
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'nigger',
  'faggot',
  'rape',
])

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase()
  for (const w of BLOCKED) {
    if (lower.includes(w)) return true
  }
  return false
}

export function maskProfanity(text: string): string {
  let out = text
  for (const w of BLOCKED) {
    const re = new RegExp(w, 'gi')
    out = out.replace(re, '*'.repeat(Math.min(w.length, 4)))
  }
  return out
}
