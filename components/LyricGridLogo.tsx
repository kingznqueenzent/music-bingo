'use client'

/** LyricGrid logo: L shape with vertical stem ending in a note head, horizontal base = 5×5 grid; middle row has wave animation. */
export function LyricGridLogo({ className = '', size = 48 }: { className?: string; size?: number }) {
  const cell = size / 8
  const stemH = size * 0.45
  const gridRows = 5
  const gridH = gridRows * cell * 1.05
  const gridY = size - gridH - cell * 0.5
  const gridX = cell * 1.4
  const neon = '#00FFFF'
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      style={{ color: neon }}
    >
      {/* L vertical stem */}
      <rect x={0} y={0} width={cell * 1.2} height={stemH} rx={cell * 0.25} fill={neon} />
      {/* Note head (oval at bottom of stem) */}
      <ellipse cx={cell * 0.6} cy={stemH + cell * 0.45} rx={cell * 0.55} ry={cell * 0.4} fill={neon} />
      {/* L horizontal base: 5×5 grid of small squares */}
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2, 3, 4].map((col) => {
          const x = gridX + col * cell * 1.05
          const y = gridY + row * cell * 1.05
          const isMiddleRow = row === 2
          return (
            <rect
              key={`${row}-${col}`}
              x={x}
              y={y}
              width={cell * 0.8}
              height={cell * 0.8}
              rx={cell * 0.2}
              fill={neon}
              className={isMiddleRow ? 'lyricgrid-grid-wave' : ''}
              style={isMiddleRow ? { animationDelay: `${col * 0.08}s` } : undefined}
            />
          )
        })
      )}
    </svg>
  )
}
