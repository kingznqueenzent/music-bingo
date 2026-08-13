'use client'

type KingzDjPlaceholderProps = {
  name: 'DJ Merci' | 'DJ Liz'
  className?: string
  /** Circular vs rounded rect — matches prior portrait shapes */
  shape?: 'circle' | 'rect'
}

/**
 * Premium branded portrait placeholder until real professional photos are provided.
 * Never use AI/stock faces as stand-ins for DJ Merci or DJ Liz.
 *
 * Drop real photos at:
 *   /assets/images/dj-merci/profile.jpg
 *   /assets/images/dj-liz/profile.jpg
 * Keep camera originals in:
 *   /assets/raw/dj-merci/
 *   /assets/raw/dj-liz/
 */
export function KingzDjPlaceholder({ name, className = '', shape = 'rect' }: KingzDjPlaceholderProps) {
  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-xl'
  const slug = name === 'DJ Merci' ? 'dj-merci' : 'dj-liz'
  const displayName = name.toUpperCase()

  return (
    <div
      className={`kingz-dj-placeholder ${rounded} ${className}`.trim()}
      role="img"
      aria-label={`${displayName} — professional photo coming soon`}
      data-future-photo={`/assets/images/${slug}/profile.jpg`}
    >
      <span className="kingz-dj-placeholder__mark" aria-hidden>
        K&Q
      </span>
      <span className="kingz-dj-placeholder__name">{displayName}</span>
      <span className="kingz-dj-placeholder__soon">Professional Photo Coming Soon</span>
    </div>
  )
}
