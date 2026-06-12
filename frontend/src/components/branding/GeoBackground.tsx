// The colourful geometric background used on the official album cover and
// sticker packs: teal / coral / purple / green blobs and arcs on cream.
export function GeoBackground({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 560"
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    >
      <rect width="400" height="560" fill="#f3efe6" />
      <circle cx="40" cy="60" r="110" fill="#2ba4a0" />
      <circle cx="370" cy="30" r="90" fill="#f4806c" />
      <path d="M400 200 q -120 40 -80 180 q 30 90 -60 180 L 400 560 Z" fill="#7b5ea7" />
      <circle cx="30" cy="420" r="100" fill="#5cb85c" />
      <path d="M0 250 q 90 -10 120 70 q 20 60 -40 90 q -70 30 -80 -40 Z" fill="#e8b93c" />
      <circle cx="210" cy="540" r="80" fill="#d6536d" />
      <circle cx="320" cy="330" r="36" fill="#2ba4a0" opacity="0.85" />
      <circle cx="120" cy="150" r="20" fill="#d6536d" opacity="0.9" />
      <path d="M250 80 a60 60 0 0 1 60 60" stroke="#0b1f4d" strokeWidth="10" fill="none" />
      <path d="M60 540 a70 70 0 0 0 70 -70" stroke="#f4806c" strokeWidth="10" fill="none" />
    </svg>
  )
}
