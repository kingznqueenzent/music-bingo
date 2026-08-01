/** Whether a catalog song lacks a usable theme/genre assignment. */
export function isUncategorizedSong(
  song: { theme_id: string | null },
  themeNameById: Map<string, string>
): boolean {
  if (!song.theme_id) return true
  const name = themeNameById.get(song.theme_id)
  if (!name) return true
  const normalized = name.trim().toLowerCase()
  return normalized === '' || normalized === 'uncategorized' || normalized === 'unassigned'
}
