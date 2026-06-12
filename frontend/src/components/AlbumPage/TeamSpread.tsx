import { useState } from 'react'
import type { AlbumSticker } from '../../types'
import { StickerCard } from '../StickerCard/StickerCard'
import { Flag } from '../branding/Flag'
import { Trophy } from '../branding/Wc26Logo'

interface TeamSpreadProps {
  team: string
  groupName: string
  teamColor: string
  teamCode: string
  stickers: AlbumSticker[] // includes the special team card
  readonly?: boolean
  onStick?: (sticker: AlbumSticker) => void
  justStuckId?: string | null
}

export function TeamSpread({
  team, groupName, teamColor, teamCode, stickers, readonly, onStick, justStuckId,
}: TeamSpreadProps) {
  const [wiggleId, setWiggleId] = useState<string | null>(null)
  const teamCard = stickers.find((s) => s.is_special)
  const players = stickers.filter((s) => !s.is_special)
  const stuck = stickers.filter((s) => s.stuck_in_album).length

  const handleClick = (s: AlbumSticker) => {
    if (readonly) return
    if (s.stuck_in_album) {
      setWiggleId(s.id)
      setTimeout(() => setWiggleId(null), 700)
      return
    }
    if (s.quantity > 0) onStick?.(s)
  }

  const slot = (s: AlbumSticker, large = false) => {
    const size = large ? 'normal' : 'mini'
    if (s.stuck_in_album) {
      return (
        <div className="group relative" key={s.id}>
          <StickerCard
            sticker={s}
            size={size}
            onClick={() => handleClick(s)}
            className={`${wiggleId === s.id ? 'wiggle' : ''} ${justStuckId === s.id ? 'fly-to-slot' : ''}`}
          />
          {wiggleId === s.id && (
            <div className="absolute -top-7 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white">
              Уже наклеена!
            </div>
          )}
          {/* hover tooltip with full info */}
          {!s.is_special && (
            <div className="pointer-events-none absolute -top-2 left-1/2 z-30 hidden w-44 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900/95 p-2 text-[11px] leading-snug text-white shadow-xl group-hover:block">
              <div className="font-bold">
                #{s.sticker_number} {s.player_name} {s.player_lastname}
              </div>
              <div className="text-white/70">{s.position} · {s.team}</div>
              {s.club && <div className="text-white/70">{s.club}</div>}
              {(s.height_cm || s.weight_kg) && (
                <div className="text-white/50">
                  {[s.height_cm && `${s.height_cm} см`, s.weight_kg && `${s.weight_kg} кг`]
                    .filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>
      )
    }
    // empty slot: dotted outline in team colour + number; clickable if owned
    const owned = s.quantity > 0
    return (
      <div
        key={s.id}
        onClick={() => handleClick(s)}
        className={`relative flex shrink-0 flex-col items-center justify-center rounded-md border-2 border-dashed bg-white/40 ${
          owned && !readonly ? 'cursor-pointer hover:bg-white/80' : ''
        }`}
        style={{
          borderColor: teamColor,
          width: large ? 160 : 80,
          height: large ? 220 : 110,
        }}
        title={owned && !readonly ? 'Наклеить из инвентаря' : undefined}
      >
        <span className="font-display text-lg font-black" style={{ color: teamColor }}>
          {s.sticker_number}
        </span>
        <span className="px-1 text-center text-[9px] font-semibold text-slate-400">
          {s.player_lastname}
        </span>
        {owned && !readonly && (
          <span className="absolute bottom-1 rounded bg-emerald-500 px-1 text-[9px] font-black text-white">
            ЕСТЬ ✓
          </span>
        )}
      </div>
    )
  }

  return (
    <section id={`team-${team.replace(/\s+/g, '-')}`} className="scroll-mt-20">
      {/* country header bar */}
      <div
        className="flex items-center gap-3 rounded-t-xl px-4 py-2.5 text-white"
        style={{ backgroundColor: teamColor }}
      >
        <Flag code={teamCode} className="h-5 w-8" />
        <h2 className="font-display text-lg font-black uppercase tracking-wide">{team}</h2>
        <span className="text-sm font-semibold opacity-80">{groupName}</span>
        <span className="ml-auto rounded-full bg-black/25 px-2.5 py-0.5 text-sm font-bold">
          {stuck}/{stickers.length}
        </span>
      </div>

      <div className="rounded-b-xl bg-white p-4 shadow">
        <div className="flex flex-wrap gap-4">
          {/* left: team special card, larger */}
          {teamCard && (
            <div className="flex flex-col items-center gap-2">
              {teamCard.stuck_in_album ? (
                <div className={justStuckId === teamCard.id ? 'fly-to-slot' : ''}>
                  <TeamCardFace sticker={teamCard} color={teamColor} code={teamCode} />
                </div>
              ) : (
                slot(teamCard, true)
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Team Card
              </span>
            </div>
          )}
          {/* right: player grid, 6 per row on desktop, 3 on mobile */}
          <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {players.map((s) => slot(s))}
          </div>
        </div>
      </div>
    </section>
  )
}

// The "WE ARE + COUNTRY" team special card.
export function TeamCardFace({
  sticker, color, code,
}: { sticker: AlbumSticker; color: string; code: string }) {
  return (
    <div
      className="relative flex h-[220px] w-[160px] shrink-0 flex-col items-center justify-between overflow-hidden rounded-md p-3 text-white shadow-md ring-1 ring-black/20"
      style={{ backgroundColor: color }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-black/25" />
      <Flag code={code} className="z-10 mt-2 w-16 shadow-lg" />
      <Trophy className="z-10 h-12 text-white/80" />
      <div className="z-10 pb-1 text-center">
        <div className="text-xs font-bold tracking-widest opacity-80">WE ARE</div>
        <div className="font-display text-base font-black uppercase leading-tight">
          {sticker.team}
        </div>
      </div>
      <div className="absolute left-1 top-1 rounded-sm bg-black/30 px-1 font-display text-[10px] font-bold">
        {sticker.sticker_number}
      </div>
    </div>
  )
}
