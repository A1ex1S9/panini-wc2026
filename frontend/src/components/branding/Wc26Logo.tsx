// Stylised FIFA World Cup 26 mark: bold "26" with the trophy silhouette
// dropped into the "2", echoing the official tournament lockup.
export function Trophy({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 100" className={className} aria-hidden>
      <g fill="currentColor">
        {/* cup bowl */}
        <path d="M6 4 H34 C34 22 28 34 20 38 C12 34 6 22 6 4 Z" />
        {/* globe */}
        <circle cx="20" cy="14" r="7" fill="#fff" opacity="0.25" />
        {/* stem */}
        <path d="M17 38 C17 50 14 58 12 64 H28 C26 58 23 50 23 38 Z" />
        {/* base */}
        <path d="M10 64 H30 L32 74 H8 Z" />
        <rect x="6" y="74" width="28" height="8" rx="2" />
        <rect x="4" y="84" width="32" height="10" rx="2" />
      </g>
    </svg>
  )
}

export function Wc26Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-end leading-none select-none ${className}`}>
      <span
        className="font-display font-black tracking-tighter"
        style={{ fontSize: '1em' }}
      >
        2
      </span>
      <span className="relative font-display font-black tracking-tighter" style={{ fontSize: '1em' }}>
        6
        <Trophy className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[0.78em] w-auto opacity-90" />
      </span>
    </div>
  )
}

export function FifaWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`font-display font-black uppercase leading-tight ${className}`}>
      FIFA World Cup 2026™
    </div>
  )
}

export function PaniniLogo({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={`inline-block bg-black text-white font-display font-black italic px-1.5 py-0.5 rounded-sm tracking-tight ${className}`}
      style={style}
    >
      PANINI
    </span>
  )
}
