// Hand-drawn approximations of the WC2026 tournament lockup: stacked white
// "2"/"6" digits with a golden trophy silhouette over them, FIFA wordmark
// and "WORLD CUP 2026" beneath. All shapes are our own SVG/CSS.

export function GoldTrophy({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 130" className={className} aria-hidden>
      <defs>
        <linearGradient id="goldv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6d77c" />
          <stop offset="0.45" stopColor="#c99a3a" />
          <stop offset="0.75" stopColor="#a87b22" />
          <stop offset="1" stopColor="#8a6418" />
        </linearGradient>
      </defs>
      <g fill="url(#goldv)">
        {/* bowl with globe */}
        <path d="M30 2 C44 2 52 10 52 22 C52 38 42 50 30 54 C18 50 8 38 8 22 C8 10 16 2 30 2 Z" />
        <circle cx="30" cy="22" r="13" fill="#e8c45e" opacity="0.55" />
        {/* swirling figures / stem */}
        <path d="M24 52 C20 64 16 72 14 80 C20 86 40 86 46 80 C44 72 40 64 36 52 Z" />
        {/* base */}
        <path d="M16 82 C12 90 10 96 10 102 H50 C50 96 48 90 44 82 Z" />
        <ellipse cx="30" cy="106" rx="24" ry="8" />
        <ellipse cx="30" cy="115" rx="20" ry="6" opacity="0.85" />
      </g>
      {/* highlight */}
      <path d="M20 8 C16 12 13 18 13 24" stroke="#fbedb9" strokeWidth="3"
        strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  )
}

// Stacked "2" over "6" with the trophy overlapping — the tournament mark.
// `digits` colour defaults to white (pack/cover); pass a team colour for
// the sticker watermark version (without trophy).
export function Wc26Stack({
  className = '',
  color = '#ffffff',
  trophy = true,
}: {
  className?: string
  color?: string
  trophy?: boolean
}) {
  return (
    <div className={`relative inline-flex flex-col items-center leading-none select-none ${className}`}>
      <span
        className="font-display font-black"
        style={{ color, fontSize: '1em', lineHeight: 0.82 }}
      >
        2
      </span>
      <span
        className="font-display font-black"
        style={{ color, fontSize: '1em', lineHeight: 0.82 }}
      >
        6
      </span>
      {trophy && (
        <GoldTrophy className="absolute left-1/2 top-1/2 h-[0.95em] w-auto -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
      )}
    </div>
  )
}

// Full centre lockup for pack / album cover.
export function Wc26Lockup({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center text-white select-none ${className}`}>
      <Wc26Stack className="text-[3.2em]" />
      <div className="mt-[0.3em] font-display text-[0.9em] font-black tracking-[0.18em]">
        FIFA
      </div>
      <div className="font-display text-[0.62em] font-black uppercase tracking-[0.1em]">
        World Cup
      </div>
      <div className="font-display text-[0.78em] font-black tracking-[0.12em]">
        2026
      </div>
    </div>
  )
}

// Small white outline mark for sticker corners: tiny stacked 26 + FIFA.
export function Wc26Mini({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`flex flex-col items-center leading-none text-white select-none ${className}`} style={style}>
      <span className="font-display font-black" style={{ lineHeight: 0.85 }}>2</span>
      <span className="font-display font-black" style={{ lineHeight: 0.85 }}>6</span>
      <span className="mt-[0.15em] font-display font-black tracking-wider" style={{ fontSize: '0.55em' }}>
        FIFA
      </span>
    </div>
  )
}

// Yellow Panini box (our own simplified rendition of the brand block).
export function PaniniLogo({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={`inline-flex items-center justify-center bg-[#f5c518] px-[0.5em] py-[0.18em] font-display font-black italic tracking-tight text-[#111] ring-1 ring-black/20 ${className}`}
      style={style}
    >
      <span className="text-[#c8102e] not-italic mr-[0.1em]">⚜</span>PANINI
    </span>
  )
}
