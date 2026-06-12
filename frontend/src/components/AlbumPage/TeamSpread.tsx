import { useState } from 'react'
import type { AlbumSticker } from '../../types'
import { StickerCard } from '../StickerCard/StickerCard'
import { Flag } from '../branding/Flag'

interface TeamSpreadProps {
  team: string
  groupName: string
  teamColor: string
  teamCode: string
  stickers: AlbumSticker[] // includes the special team card
  readonly?: boolean
  onStick?: (sticker: AlbumSticker) => void
  justStuckId?: string | null
  /** sticker id currently being dragged from the side panel */
  draggingId?: string | null
  /** sticker id whose slot should flash (after clicking a card in the panel) */
  highlightId?: string | null
}

export function slotDomId(s: { sticker_number: number }) {
  return `slot-${s.sticker_number}`
}

export function TeamSpread({
  team, groupName, teamColor, teamCode, stickers, readonly,
  onStick, justStuckId, draggingId, highlightId,
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
        <div className="group relative" key={s.id} id={slotDomId(s)}>
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
          {!s.is_special && (
            <div className="pointer-events-none absolute -top-2 left-1/2 z-30 hidden w-44 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900/95 p-2 text-[11px] leading-snug text-white shadow-xl group-hover:block">
              <div className="font-bold">
                #{s.sticker_number} {s.player_name} {s.player_lastname}
              </div>
              <div className="text-white/70">{s.position} · {s.team}</div>
              {s.club && <div className="text-white/70">{s.club}</div>}
            </div>
          )}
        </div>
      )
    }

    // empty slot: dotted outline + number; drop target while dragging
    const owned = s.quantity > 0
    const isDropTarget = draggingId === s.id
    const isFlashing = highlightId === s.id
    return (
      <div
        key={s.id}
        id={slotDomId(s)}
        onClick={() => handleClick(s)}
        onDragOver={(e) => { if (isDropTarget) e.preventDefault() }}
        onDrop={(e) => {
          if (!isDropTarget) return
          e.preventDefault()
          onStick?.(s)
        }}
        className={`relative flex shrink-0 flex-col items-center justify-center rounded-[4px] border-2 border-dashed transition ${
          isDropTarget || isFlashing
            ? 'animate-pulse border-emerald-400 bg-emerald-50 ring-4 ring-emerald-300/70'
            : 'bg-white/40'
        } ${owned && !readonly ? 'cursor-pointer hover:bg-white/80' : ''}`}
        style={{
          borderColor: isDropTarget || isFlashing ? undefined : teamColor,
          width: large ? 160 : 80,
          height: large ? 220 : 110,
        }}
        title={owned && !readonly ? 'Наклеить из панели слева' : undefined}
      >
        <span className="font-display text-lg font-black" style={{ color: teamColor }}>
          {s.sticker_number}
        </span>
        <span className="px-1 text-center text-[9px] font-semibold text-slate-400">
          {s.player_lastname}
        </span>
        {isDropTarget && (
          <span className="absolute bottom-1 rounded bg-emerald-500 px-1 text-[9px] font-black text-white">
            СЮДА!
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
          {teamCard && (
            <div className="flex flex-col items-center gap-2">
              {slot(teamCard, true)}
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Team Card
              </span>
            </div>
          )}
          <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {players.map((s) => slot(s))}
          </div>
        </div>
      </div>
    </section>
  )
}
