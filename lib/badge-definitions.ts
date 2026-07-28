/** Badge IDs stored in leaderboard.badges — evaluated in player-progress */

export type BadgeConditionType =
  | 'games_played'
  | 'wins'
  | 'streak'
  | 'level'
  | 'tournaments_entered'
  | 'chat_messages_sent'
  | 'chat_distinct_days'

export interface BadgeDefinitionRow {
  id: string
  name: string
  description: string
  icon_url: string | null
  condition_type: BadgeConditionType
  condition_value: number
}

/** Seed matches DB; icons are emoji URLs as data URI or short labels for UI */
export const BADGE_DEFINITIONS: BadgeDefinitionRow[] = [
  {
    id: 'first_timer',
    name: 'First Timer',
    description: 'Play your first game',
    icon_url: null,
    condition_type: 'games_played',
    condition_value: 1,
  },
  {
    id: 'on_fire',
    name: 'On Fire',
    description: '3 week streak',
    icon_url: null,
    condition_type: 'streak',
    condition_value: 3,
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: '5 week streak',
    icon_url: null,
    condition_type: 'streak',
    condition_value: 5,
  },
  {
    id: 'unbreakable',
    name: 'Unbreakable',
    description: '10 week streak',
    icon_url: null,
    condition_type: 'streak',
    condition_value: 10,
  },
  {
    id: 'first_win',
    name: 'Winner',
    description: 'First win',
    icon_url: null,
    condition_type: 'wins',
    condition_value: 1,
  },
  {
    id: 'hat_trick',
    name: 'Hat Trick',
    description: '3 wins total',
    icon_url: null,
    condition_type: 'wins',
    condition_value: 3,
  },
  {
    id: 'sharp_shooter',
    name: 'Sharp Shooter',
    description: '10 wins total',
    icon_url: null,
    condition_type: 'wins',
    condition_value: 10,
  },
  {
    id: 'lyric_legend',
    name: 'Legend',
    description: 'Reach Level 5',
    icon_url: null,
    condition_type: 'level',
    condition_value: 5,
  },
  {
    id: 'tournament_champion',
    name: 'Champion',
    description: 'Win a LyricGrid tournament',
    icon_url: null,
    condition_type: 'wins',
    condition_value: 999999,
  },
  {
    id: 'tournament_finalist',
    name: 'Finalist',
    description: 'Place top 3 in a tournament',
    icon_url: null,
    condition_type: 'wins',
    condition_value: 999998,
  },
  {
    id: 'tournament_veteran',
    name: 'Series Veteran',
    description: 'Enter 3 or more tournaments',
    icon_url: null,
    condition_type: 'tournaments_entered',
    condition_value: 3,
  },
  {
    id: 'premium_patron',
    name: 'Premium Patron',
    description: 'LyricGrid Premium subscriber',
    icon_url: null,
    condition_type: 'games_played',
    condition_value: 99999,
  },
  {
    id: 'chatterbox',
    name: 'Chatterbox',
    description: 'Send 50 chat messages',
    icon_url: null,
    condition_type: 'chat_messages_sent',
    condition_value: 50,
  },
  {
    id: 'community_pillar',
    name: 'Community Pillar',
    description: '30 distinct days of chat activity',
    icon_url: null,
    condition_type: 'chat_distinct_days',
    condition_value: 30,
  },
]

export function evaluateNewBadges(input: {
  gamesPlayed: number
  wins: number
  streakCurrent: number
  level: number
  existingBadgeIds: string[]
  tournamentsEntered?: number
  chatMessagesSent?: number
  chatDistinctDays?: number
}): string[] {
  const have = new Set(input.existingBadgeIds)
  const next: string[] = []
  for (const b of BADGE_DEFINITIONS) {
    if (have.has(b.id)) continue
    let ok = false
    switch (b.condition_type) {
      case 'games_played':
        ok = input.gamesPlayed >= b.condition_value
        break
      case 'wins':
        ok = input.wins >= b.condition_value
        break
      case 'streak':
        ok = input.streakCurrent >= b.condition_value
        break
      case 'level':
        ok = input.level >= b.condition_value
        break
      case 'tournaments_entered':
        ok = (input.tournamentsEntered ?? 0) >= b.condition_value
        break
      case 'chat_messages_sent':
        ok = (input.chatMessagesSent ?? 0) >= b.condition_value
        break
      case 'chat_distinct_days':
        ok = (input.chatDistinctDays ?? 0) >= b.condition_value
        break
      default:
        break
    }
    if (ok) next.push(b.id)
  }
  return next
}
