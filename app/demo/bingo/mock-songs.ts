import type { BingoCardCell } from '@/components/bingo/BingoCard'
import { getFreeCenterPosition } from '@/lib/bingo-win-pattern'

export type DemoSong = {
  id: string
  title: string
  artist: string
  albumArtUrl: string
}

/** 24 realistic tracks — enough for a 5×5 board minus the center free space. */
export const DEMO_SONGS: DemoSong[] = [
  { id: 'demo-01', title: 'Bohemian Rhapsody', artist: 'Queen', albumArtUrl: 'https://picsum.photos/seed/bohemian/80/80' },
  { id: 'demo-02', title: 'Billie Jean', artist: 'Michael Jackson', albumArtUrl: 'https://picsum.photos/seed/billie/80/80' },
  { id: 'demo-03', title: 'Sweet Child O\' Mine', artist: "Guns N' Roses", albumArtUrl: 'https://picsum.photos/seed/sweet/80/80' },
  { id: 'demo-04', title: 'Smells Like Teen Spirit', artist: 'Nirvana', albumArtUrl: 'https://picsum.photos/seed/teen/80/80' },
  { id: 'demo-05', title: 'Wonderwall', artist: 'Oasis', albumArtUrl: 'https://picsum.photos/seed/wonder/80/80' },
  { id: 'demo-06', title: 'Lose Yourself', artist: 'Eminem', albumArtUrl: 'https://picsum.photos/seed/lose/80/80' },
  { id: 'demo-07', title: 'Uptown Funk', artist: 'Bruno Mars', albumArtUrl: 'https://picsum.photos/seed/uptown/80/80' },
  { id: 'demo-08', title: 'Blinding Lights', artist: 'The Weeknd', albumArtUrl: 'https://picsum.photos/seed/blinding/80/80' },
  { id: 'demo-09', title: 'Shape of You', artist: 'Ed Sheeran', albumArtUrl: 'https://picsum.photos/seed/shape/80/80' },
  { id: 'demo-10', title: 'Rolling in the Deep', artist: 'Adele', albumArtUrl: 'https://picsum.photos/seed/rolling/80/80' },
  { id: 'demo-11', title: 'Mr. Brightside', artist: 'The Killers', albumArtUrl: 'https://picsum.photos/seed/bright/80/80' },
  { id: 'demo-12', title: 'Don\'t Stop Believin\'', artist: 'Journey', albumArtUrl: 'https://picsum.photos/seed/believin/80/80' },
  { id: 'demo-13', title: 'Dancing Queen', artist: 'ABBA', albumArtUrl: 'https://picsum.photos/seed/dancing/80/80' },
  { id: 'demo-14', title: 'I Will Survive', artist: 'Gloria Gaynor', albumArtUrl: 'https://picsum.photos/seed/survive/80/80' },
  { id: 'demo-15', title: 'September', artist: 'Earth, Wind & Fire', albumArtUrl: 'https://picsum.photos/seed/september/80/80' },
  { id: 'demo-16', title: 'Juice', artist: 'Lizzo', albumArtUrl: 'https://picsum.photos/seed/juice/80/80' },
  { id: 'demo-17', title: 'Levitating', artist: 'Dua Lipa', albumArtUrl: 'https://picsum.photos/seed/levitating/80/80' },
  { id: 'demo-18', title: 'Bad Guy', artist: 'Billie Eilish', albumArtUrl: 'https://picsum.photos/seed/badguy/80/80' },
  { id: 'demo-19', title: 'Old Town Road', artist: 'Lil Nas X', albumArtUrl: 'https://picsum.photos/seed/oldtown/80/80' },
  { id: 'demo-20', title: 'Happy', artist: 'Pharrell Williams', albumArtUrl: 'https://picsum.photos/seed/happy/80/80' },
  { id: 'demo-21', title: 'Shut Up and Dance', artist: 'WALK THE MOON', albumArtUrl: 'https://picsum.photos/seed/shutup/80/80' },
  { id: 'demo-22', title: 'Crazy in Love', artist: 'Beyoncé', albumArtUrl: 'https://picsum.photos/seed/crazy/80/80' },
  { id: 'demo-23', title: 'Hey Ya!', artist: 'OutKast', albumArtUrl: 'https://picsum.photos/seed/heya/80/80' },
  { id: 'demo-24', title: 'Single Ladies', artist: 'Beyoncé', albumArtUrl: 'https://picsum.photos/seed/single/80/80' },
]

const BOARD_SIZE = 5

/** Build BingoCard cells for the demo board (center free space left empty). */
export function buildDemoCells(songs: DemoSong[] = DEMO_SONGS): BingoCardCell[] {
  const freePosition = getFreeCenterPosition(BOARD_SIZE)
  const cellCount = BOARD_SIZE * BOARD_SIZE
  const slots = Array.from({ length: cellCount }, (_, position) => position).filter(
    (position) => position !== freePosition
  )

  return slots.map((position, index) => {
    const song = songs[index]
    return {
      id: `demo-cell-${position}`,
      position,
      playlistSongId: song.id,
      label: `${song.title} — ${song.artist}`,
      title: song.title,
      artist: song.artist,
      albumArtUrl: song.albumArtUrl,
    }
  })
}
