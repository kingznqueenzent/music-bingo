'use server'

import { createClient } from '@/lib/supabase/server'
import type { GameSponsor } from '@/lib/supabase/types'

export async function listGameSponsors(gameId: string): Promise<{ sponsors: GameSponsor[] } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('game_sponsors')
    .select('*')
    .eq('game_id', gameId)
    .order('sort_order')
    .order('created_at')
  if (error) return { error: error.message }
  return { sponsors: (data ?? []) as GameSponsor[] }
}

export async function addGameSponsor(
  gameId: string,
  input: { name: string; logoUrl?: string | null }
): Promise<{ ok: true } | { error: string }> {
  const name = input.name.trim()
  if (!name) return { error: 'Sponsor name is required.' }
  const supabase = createClient()
  const { count } = await supabase.from('game_sponsors').select('*', { count: 'exact', head: true }).eq('game_id', gameId)
  const { error } = await supabase.from('game_sponsors').insert({
    game_id: gameId,
    name,
    logo_url: input.logoUrl?.trim() || null,
    sort_order: count ?? 0,
  })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function deleteGameSponsor(sponsorId: string, gameId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('game_sponsors').delete().eq('id', sponsorId).eq('game_id', gameId)
  if (error) return { error: error.message }
  return { ok: true }
}
