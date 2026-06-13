import type { Sticker } from '../../types'
import { Flag } from '../branding/Flag'
import { Wc26Mini, GoldTrophy, PaniniLogo } from '../branding/Wc26Logo'
import { fifaCode } from '../../lib/fifaCodes'

interface StickerCardProps {
  sticker: Sticker
  size?: 'mini' | 'normal' | 'large' // 80×110 | 160×220 | 240×330
  isNew?: boolean
  isDuplicate?: boolean
  duplicateCount?: number
  onClick?: () => void
  className?: string
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

const SIZES = {
  mini: { w: 80, h: 110 },
  normal: { w: 160, h: 220 },
  large: { w: 240, h: 330 },
}

// Name-pill colour by position, echoing the printed sticker series.
const POSITION_COLORS: Record<string, [string, string]> = {
  GK: ['#8a5fb8', '#5d3a8a'],
  DEF: ['#e15a78', '#b83a5c'],
  MID: ['#f0913a', '#d96a25'],
  FWD: ['#1f7d74', '#135d59'],
  '': ['#456', '#234'],
}

const MINT = '#bfe0d2'
const INK = '#0f3f3a' // dark teal used for info text/bars

function fmtDob(dob: string | null): string {
  if (!dob) return ''
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate())
  const mm = String(d.getMonth() + 1)
  return `${dd}-${mm}-${d.getFullYear()}`
}

function Silhouette({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="32" r="19" fill="rgba(15,63,58,0.30)" />
      <path d="M15 100 C15 72 31 61 50 61 C69 61 85 72 85 100 Z" fill="rgba(15,63,58,0.30)" />
    </svg>
  )
}

// Special stickers (trophy / host city / team card) use a foil-style face.
function SpecialFace({ sticker, dims }: { sticker: Sticker; dims: { w: number; h: number } }) {
  const isTeam = !!sticker.team_code
  const base = sticker.team_color || '#8a1538'
  return (
    <div className="absolute inset-0" style={{ backgroundColor: base }}>
      {/* foil shimmer + tonal pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(0,0,0,0.25),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 9px)',
        }}
      />
      <div
        className="absolute inset-x-0 top-0 py-[3%] text-center font-display font-black uppercase tracking-wider text-white/90"
        style={{ fontSize: dims.h * 0.045 }}
      >
        FIFA World Cup 2026™
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        {isTeam ? (
          <div
            className="flex items-center justify-center rounded-[18%] bg-white shadow-lg"
            style={{ width: dims.w * 0.56, height: dims.w * 0.56 }}
          >
            <Flag code={sticker.team_code} className="w-[70%]" />
          </div>
        ) : (
          <GoldTrophy className="h-[55%] w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]" />
        )}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-[6%] py-[3%] text-white"
        style={{ fontSize: dims.h * 0.05 }}
      >
        <span className="truncate font-display font-black uppercase">
          {isTeam ? (
            <>WE ARE <span className="text-[0.8em]">✚</span> {sticker.team}</>
          ) : (
            sticker.player_lastname
          )}
        </span>
        <PaniniLogo style={{ fontSize: dims.h * 0.032 }} />
      </div>
      <div
        className="absolute left-[4%] top-[12%] rounded-sm bg-white/90 px-[0.35em] font-display font-black"
        style={{ fontSize: dims.h * 0.05, color: base }}
      >
        {sticker.sticker_number}
      </div>
    </div>
  )
}

export function StickerCard({
  sticker, size = 'normal', isNew, isDuplicate, duplicateCount = 2, onClick,
  className = '', draggable, onDragStart, onDragEnd,
}: StickerCardProps) {
  const dims = SIZES[size]
  const isLegend = sticker.rarity === 'legend'
  const [pillA, pillB] = POSITION_COLORS[sticker.position] ?? POSITION_COLORS['']
  const code = fifaCode(sticker.team)
  const mini = size === 'mini'

  const infoLine = [
    fmtDob(sticker.dob),
    sticker.height_cm ? `${(sticker.height_cm / 100).toFixed(2).replace('.', ',')} m` : '',
    sticker.weight_kg ? `${sticker.weight_kg} kg` : '',
  ].filter(Boolean).join(' | ')

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`relative shrink-0 select-none overflow-hidden rounded-[4px] ${
        onClick || draggable ? 'cursor-pointer' : ''
      } ${
        isLegend
          ? 'ring-3 ring-yellow-400 shadow-[0_0_18px_rgba(255,200,40,0.65)]'
          : 'ring-1 ring-black/15 shadow-md'
      } ${className}`}
      style={{ width: dims.w, height: dims.h, backgroundColor: MINT }}
    >
      {sticker.is_special ? (
        <SpecialFace sticker={sticker} dims={dims} />
      ) : (
        <>
          {/* giant stacked 2/6 in team colour behind the player */}
          <div
            className="absolute left-[2%] top-[-2%] flex flex-col font-display font-black"
            style={{ color: sticker.team_color, fontSize: dims.h * 0.52, lineHeight: 0.78 }}
          >
            <span>2</span>
            <span>6</span>
          </div>

          {/* white notch with the sticker number, sitting on the "2" */}
          <div
            className="absolute z-10 flex items-center justify-center bg-white/95 font-display font-black shadow-sm"
            style={{
              left: '4%',
              top: '40%',
              width: dims.w * 0.19,
              height: dims.w * 0.19,
              fontSize: dims.h * 0.05,
              color: sticker.team_color,
            }}
          >
            {sticker.sticker_number}
          </div>

          {/* top-right tournament mini-mark */}
          <Wc26Mini
            className="absolute right-[4%] top-[3%] drop-shadow-sm"
            style={{ fontSize: dims.h * 0.052 }}
          />

          {/* right edge: flag + vertical trigram */}
          <Flag
            code={sticker.team_code}
            className="absolute right-[3%] top-[30%] w-[15%] min-w-4"
          />
          <div
            className="absolute right-[2.5%] top-[44%] flex flex-col items-center font-display font-black leading-[0.95]"
            style={{
              fontSize: dims.h * 0.075,
              color: 'transparent',
              WebkitTextStroke: `1px ${sticker.team_color}`,
            }}
          >
            {code.split('').map((ch, i) => <span key={i}>{ch}</span>)}
          </div>

          {/* player photo, centred so the 26 / trigram peek out at the sides */}
          <div
            className="absolute"
            style={{ left: '16%', right: '16%', top: '6%', height: mini ? '64%' : '60%' }}
          >
            {sticker.photo_url ? (
              <img
                src={sticker.photo_url}
                alt={`${sticker.player_name} ${sticker.player_lastname}`}
                loading="lazy"
                className="h-full w-full object-cover object-top"
                style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.25))' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <Silhouette className="h-full w-full" />
            )}
          </div>

          {/* bottom info block on mint */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center" style={{ paddingBottom: '3%' }}>
            {/* name pill */}
            <div
              className="flex max-w-[94%] items-baseline justify-center gap-[0.35em] truncate rounded-full px-[0.9em] text-white shadow"
              style={{
                background: `linear-gradient(180deg, ${pillA}, ${pillB})`,
                fontSize: mini ? dims.h * 0.062 : dims.h * 0.05,
                paddingTop: '0.28em',
                paddingBottom: '0.28em',
              }}
            >
              {!mini && sticker.player_name && (
                <span className="font-semibold uppercase opacity-90">{sticker.player_name}</span>
              )}
              <span className="font-display font-black uppercase">{sticker.player_lastname}</span>
            </div>

            {!mini && (
              <>
                {infoLine && (
                  <div
                    className="mt-[2%] font-bold"
                    style={{ fontSize: dims.h * 0.034, color: INK }}
                  >
                    {infoLine}
                  </div>
                )}
                {/* club bar */}
                <div
                  className="mt-[2%] flex w-[88%] items-center justify-between gap-1 rounded-sm px-[0.6em] py-[0.25em] text-white"
                  style={{ backgroundColor: INK, fontSize: dims.h * 0.034 }}
                >
                  <span className="truncate font-bold uppercase tracking-wide">
                    {sticker.club || sticker.team}
                  </span>
                  <PaniniLogo style={{ fontSize: dims.h * 0.03 }} />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* badges */}
      {isNew && (
        <div className="badge-pop absolute left-1 top-1 z-20 rounded bg-emerald-400 px-1.5 py-0.5 font-display text-[10px] font-black text-emerald-950 shadow">
          NEW! ✨
        </div>
      )}
      {isDuplicate && (
        <div className="badge-pop absolute left-1 top-1 z-20 rounded bg-red-600 px-1.5 py-0.5 font-display text-[10px] font-black text-white shadow">
          ДУБЛЬ ×{duplicateCount}
        </div>
      )}
    </div>
  )
}

export default StickerCard
