// Colourful mosaic of rounded geometric tiles — the WC2026 brand pattern
// used on the official album cover and sticker packs. Deterministic
// pseudo-random layout so it renders identically everywhere.
const PALETTE = [
  '#d23b2e', '#2b3a8f', '#2f6db5', '#69a73e', '#9dc73c',
  '#e98a2b', '#7b3f98', '#1f9e93', '#c5417f', '#e4b62c',
]

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

export function Mosaic({
  cols = 8,
  rows = 11,
  seed = 7,
  className = '',
}: {
  cols?: number
  rows?: number
  seed?: number
  className?: string
}) {
  const rand = rng(seed)
  const cell = 40
  const tiles: React.ReactNode[] = []

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const bg = PALETTE[Math.floor(rand() * PALETTE.length)]
      let fg = PALETTE[Math.floor(rand() * PALETTE.length)]
      if (fg === bg) fg = PALETTE[(PALETTE.indexOf(fg) + 3) % PALETTE.length]
      const cx = x * cell
      const cy = y * cell
      const kind = Math.floor(rand() * 4)
      const corner = Math.floor(rand() * 4)
      tiles.push(
        <g key={`${x}-${y}`}>
          <rect x={cx} y={cy} width={cell} height={cell} fill={bg} />
          {kind === 0 && (
            // quarter circle anchored in one corner
            <path
              d={
                corner === 0 ? `M${cx} ${cy} h${cell} a${cell} ${cell} 0 0 1 -${cell} ${cell} Z`
                : corner === 1 ? `M${cx + cell} ${cy} v${cell} a${cell} ${cell} 0 0 1 -${cell} -${cell} Z`
                : corner === 2 ? `M${cx + cell} ${cy + cell} h-${cell} a${cell} ${cell} 0 0 1 ${cell} -${cell} Z`
                : `M${cx} ${cy + cell} v-${cell} a${cell} ${cell} 0 0 1 ${cell} ${cell} Z`
              }
              fill={fg}
            />
          )}
          {kind === 1 && (
            <circle cx={cx + cell / 2} cy={cy + cell / 2} r={cell * 0.38} fill={fg} />
          )}
          {kind === 2 && (
            // half circle ("leaf") on one side
            <path
              d={
                corner % 2 === 0
                  ? `M${cx} ${cy} h${cell} a${cell / 2} ${cell / 2} 0 0 1 -${cell} 0 Z`
                  : `M${cx} ${cy + cell} h${cell} a${cell / 2} ${cell / 2} 0 0 0 -${cell} 0 Z`
              }
              fill={fg}
            />
          )}
          {/* kind 3: solid tile, no foreground shape */}
        </g>,
      )
    }
  }

  return (
    <svg
      viewBox={`0 0 ${cols * cell} ${rows * cell}`}
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    >
      {tiles}
    </svg>
  )
}
