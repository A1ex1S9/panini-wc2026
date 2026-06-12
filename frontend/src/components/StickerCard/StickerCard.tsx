import type { Sticker } from '../../types'
import { Flag } from '../branding/Flag'
import { Trophy, Wc26Logo, PaniniLogo } from '../branding/Wc26Logo'

interface StickerCardProps {
  sticker: Sticker
  size?: 'mini' | 'normal' | 'large' // 80×110 | 160×220 | 240×330
  isNew?: boolean
  isDuplicate?: boolean
  duplicateCount?: number
  onClick?: () => void
  className?: string
}

const SIZES = {
  mini: { w: 80, h: 110, info: false },
  normal: { w: 160, h: 220, info: true },
  large: { w: 240, h: 330, info: true },
}

function darken(hex: string, factor = 0.62): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#11202c'
  const n = parseInt(m[1], 16)
  const r = Math.round(((n >> 16) & 255) * factor)
  const g = Math.round(((n >> 8) & 255) * factor)
  const b = Math.round((n & 255) * factor)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function fmtDob(dob: string | null): string {
  if (!dob) return ''
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Silhouette({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="34" r="20" fill="rgba(255,255,255,0.35)" />
      <path d="M14 100 C14 72 30 62 50 62 C70 62 86 72 86 100 Z" fill="rgba(255,255,255,0.35)" />
    </svg>
  )
}

export function StickerCard({
  sticker, size = 'normal', isNew, isDuplicate, duplicateCount = 2, onClick, className = '',
}: StickerCardProps) {
  const dims = SIZES[size]
  const dark = darken(sticker.team_color)
  const isLegend = sticker.rarity === 'legend'

  const stats = [fmtDob(sticker.dob),
    sticker.height_cm ? `${sticker.height_cm} cm` : '',
    sticker.weight_kg ? `${sticker.weight_kg} kg` : '',
  ].filter(Boolean).join(' · ')

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 overflow-hidden rounded-md select-none ${onClick ? 'cursor-pointer' : ''} ${
        isLegend
          ? 'ring-3 ring-yellow-400 shadow-[0_0_18px_rgba(255,200,40,0.65)]'
          : 'ring-1 ring-black/20 shadow-md'
      } ${className}`}
      style={{ width: dims.w, height: dims.h, backgroundColor: sticker.team_color }}
    >
      {/* faded "26" watermark with trophy, official WC2026 branding */}
      <div
        className="absolute inset-x-0 top-0 flex justify-center pointer-events-none text-white"
        style={{ opacity: 0.15, fontSize: dims.h * 0.4 }}
      >
        <Wc26Logo />
      </div>

      {/* top-right: flag + trophy */}
      <div className="absolute right-[5%] top-[3%] z-10 flex flex-col items-end gap-[6%]">
        <Flag code={sticker.team_code} className="w-[26%] min-w-5" />
        <Trophy className="w-[12%] min-w-2 text-yellow-100/90" />
      </div>

      {/* sticker number top-left */}
      <div
        className="absolute left-[5%] top-[3%] z-10 rounded-sm bg-black/30 px-1 font-display font-bold text-white"
        style={{ fontSize: Math.max(9, dims.h * 0.05) }}
      >
        {sticker.sticker_number}
      </div>

      {/* player photo — chest-up portrait filling ~65% of the card */}
      <div className="absolute inset-x-0 top-[8%]" style={{ height: '65%' }}>
        {sticker.photo_url ? (
          <img
            src={sticker.photo_url}
            alt={`${sticker.player_name} ${sticker.player_lastname}`}
            loading="lazy"
            className="h-full w-full object-cover object-top"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <Silhouette className="h-full w-full" />
        )}
      </div>

      {/* bottom info band */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col justify-end px-[6%] py-[3%] text-white"
        style={{ backgroundColor: dark, height: dims.info ? '27%' : '30%' }}
      >
        {dims.info ? (
          <>
            <div className="truncate opacity-85" style={{ fontSize: dims.h * 0.045 }}>
              {sticker.player_name || ' '}
            </div>
            <div
              className="truncate font-display font-black uppercase leading-tight"
              style={{ fontSize: dims.h * 0.065 }}
            >
              {sticker.player_lastname}
            </div>
            {stats && (
              <div className="truncate text-white/60" style={{ fontSize: dims.h * 0.035 }}>
                {stats}
              </div>
            )}
            <div className="flex items-end justify-between gap-1">
              <span className="truncate text-white/75" style={{ fontSize: dims.h * 0.038 }}>
                {sticker.club}
              </span>
              <PaniniLogo className="origin-bottom-right" style={{ fontSize: dims.h * 0.035 }} />
            </div>
          </>
        ) : (
          <div
            className="truncate text-center font-display font-black uppercase"
            style={{ fontSize: dims.h * 0.075 }}
          >
            {sticker.player_lastname}
          </div>
        )}
      </div>

      {/* badges */}
      {isNew && (
        <div className="badge-pop absolute left-1 top-[30%] z-20 rounded bg-emerald-400 px-1.5 py-0.5 font-display text-[10px] font-black text-emerald-950 shadow">
          NEW! ✨
        </div>
      )}
      {isDuplicate && (
        <div className="badge-pop absolute left-1 top-[30%] z-20 rounded bg-red-600 px-1.5 py-0.5 font-display text-[10px] font-black text-white shadow">
          ДУБЛЬ ×{duplicateCount}
        </div>
      )}
    </div>
  )
}

export default StickerCard
