import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { AlbumSticker } from '../types'
import { TeamSpread, slotDomId } from '../components/AlbumPage/TeamSpread'
import { StickerCard } from '../components/StickerCard/StickerCard'
import { Flag } from '../components/branding/Flag'
import { OrientationBanner } from '../components/OrientationBanner'

export interface TeamGroup {
  team: string
  groupName: string
  color: string
  code: string
  stickers: AlbumSticker[]
  stuck: number
}

export function groupByTeam(stickers: AlbumSticker[]): {
  specials: AlbumSticker[]
  teams: TeamGroup[]
} {
  const specials = stickers.filter((s) => s.team === 'Special' || s.team === 'Host Cities')
  const byTeam = new Map<string, AlbumSticker[]>()
  for (const s of stickers) {
    if (s.team === 'Special' || s.team === 'Host Cities') continue
    const list = byTeam.get(s.team) || []
    list.push(s)
    byTeam.set(s.team, list)
  }
  const teams: TeamGroup[] = [...byTeam.entries()].map(([team, list]) => ({
    team,
    groupName: list[0].group_name,
    color: list[0].team_color,
    code: list[0].team_code,
    stickers: list,
    stuck: list.filter((s) => s.stuck_in_album).length,
  }))
  teams.sort((a, b) =>
    a.groupName === b.groupName ? a.team.localeCompare(b.team) : a.groupName.localeCompare(b.groupName))
  return { specials, teams }
}

// true when the primary input is touch (phone/tablet)
const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia('(pointer:coarse)').matches

export default function Album() {
  const [stickers, setStickers] = useState<AlbumSticker[]>([])
  const [loading, setLoading] = useState(true)
  const [justStuckId, setJustStuckId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  // mobile tap-to-select: id of the card currently selected in hand
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { stickers } = await api.album()
      setStickers(stickers)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const { specials, teams } = useMemo(() => groupByTeam(stickers), [stickers])
  const totalStuck = stickers.filter((s) => s.stuck_in_album).length

  // cards in hand: owned but not yet stuck, sorted by album order
  const hand = useMemo(
    () => stickers.filter((s) => s.quantity > 0 && !s.stuck_in_album),
    [stickers],
  )

  const stick = async (s: AlbumSticker) => {
    try {
      await api.stick(s.id)
      setJustStuckId(s.id)
      setStickers((prev) =>
        prev.map((p) => (p.id === s.id ? { ...p, stuck_in_album: true } : p)))
      setTimeout(() => setJustStuckId(null), 800)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не получилось наклеить')
    } finally {
      setDraggingId(null)
      setHighlightId(null)
    }
  }

  // click a card in hand:
  // • touch device → select it (highlight slot + remember for tap-to-place)
  // • desktop → just flash the slot
  const handleCardClick = (s: AlbumSticker) => {
    if (isTouchDevice()) {
      if (selectedId === s.id) {
        setSelectedId(null)
        setHighlightId(null)
      } else {
        setSelectedId(s.id)
        setHighlightId(s.id)
        document.getElementById(slotDomId(s))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else {
      setHighlightId(s.id)
      document.getElementById(slotDomId(s))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setHighlightId((cur) => (cur === s.id ? null : cur)), 2500)
    }
  }

  // tap on a slot when a card is selected → stick it
  const handleSlotTap = (s: AlbumSticker) => {
    if (selectedId === s.id) {
      stick(s).then(() => setSelectedId(null))
    }
  }

  if (loading) {
    return <p className="py-20 text-center text-slate-400">Загружаем альбом…</p>
  }

  const touch = isTouchDevice()

  return (
    <>
    <OrientationBanner />
    <div className="flex gap-5">
      {/* desktop left panel */}
      <aside className="sticky top-16 hidden max-h-[calc(100vh-5rem)] w-[210px] shrink-0 flex-col rounded-xl bg-white p-3 shadow md:flex">
        <div className="mb-1 px-1 font-display text-sm font-black uppercase text-panini-navy">
          Мои наклейки
        </div>
        <p className="mb-2 px-1 text-[11px] leading-snug text-slate-400">
          Перетащи карточку на её место в альбоме — слот подсветится. Клик —
          показать место.
        </p>
        {hand.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-400">
            Всё наклеено!{' '}
            <Link to="/packs" className="font-bold text-panini-blue hover:underline">
              Открой пакетик →
            </Link>
          </p>
        ) : (
          <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1">
            {hand.map((s) => (
              <div key={s.id} className="relative">
                <StickerCard
                  sticker={s}
                  size="mini"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', s.id)
                    e.dataTransfer.effectAllowed = 'move'
                    setDraggingId(s.id)
                    setHighlightId(s.id)
                    document.getElementById(slotDomId(s))?.scrollIntoView({
                      behavior: 'smooth', block: 'center',
                    })
                  }}
                  onDragEnd={() => { setDraggingId(null); setHighlightId(null) }}
                  onClick={() => handleCardClick(s)}
                  className={draggingId === s.id ? 'opacity-40' : ''}
                />
                {s.quantity > 1 && (
                  <span className="absolute -right-1 -top-1 z-10 rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white shadow">
                    ×{s.quantity}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 border-t border-slate-100 pt-2 text-center text-[11px] font-semibold text-slate-400">
          В руке: {hand.length} · Наклеено: {totalStuck}/{stickers.length}
        </div>
      </aside>

      {/* mobile bottom bar: scrollable row of hand cards */}
      {touch && hand.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-panini-navy/95 backdrop-blur-sm pb-safe md:hidden"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          <p className="px-3 pt-2 text-[10px] font-semibold text-white/50">
            {selectedId
              ? 'Нажми на подсвеченный слот, чтобы наклеить'
              : `Мои наклейки (${hand.length}) — нажми карточку, потом слот`}
          </p>
          <div className="flex gap-2 overflow-x-auto px-3 py-2">
            {hand.map((s) => (
              <div key={s.id} className="relative shrink-0">
                <StickerCard
                  sticker={s}
                  size="mini"
                  onClick={() => handleCardClick(s)}
                  className={`transition-all ${selectedId === s.id ? 'ring-4 ring-yellow-400 scale-110' : 'opacity-90'}`}
                />
                {s.quantity > 1 && (
                  <span className="absolute -right-1 -top-1 z-10 rounded-full bg-red-600 px-1 text-[9px] font-black text-white">
                    ×{s.quantity}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* album spreads */}
      <div className={`min-w-0 flex-1 space-y-8 ${touch && hand.length > 0 ? 'pb-36' : ''}`}>
        {/* team navigator */}
        <nav className="flex flex-wrap gap-1.5 rounded-xl bg-white p-3 shadow">
          <a
            href="#specials"
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
          >
            ⭐ Специальные
          </a>
          {teams.map((t) => (
            <a
              key={t.team}
              href={`#team-${t.team.replace(/\s+/g, '-')}`}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold hover:brightness-95 ${
                t.stuck === t.stickers.length
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Flag code={t.code} className="h-3 w-4.5" />
              {t.team}
              <span className="opacity-60">{t.stuck}/{t.stickers.length}</span>
            </a>
          ))}
        </nav>

        <section id="specials" className="scroll-mt-20">
          <div className="flex items-center gap-3 rounded-t-xl bg-panini-navy px-4 py-2.5 text-white">
            <h2 className="font-display text-lg font-black uppercase tracking-wide">
              Трофей и города-хозяева
            </h2>
            <span className="ml-auto rounded-full bg-black/25 px-2.5 py-0.5 text-sm font-bold">
              {specials.filter((s) => s.stuck_in_album).length}/{specials.length}
            </span>
          </div>
          <div className="rounded-b-xl bg-white p-4 shadow">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {specials.map((s) => {
                const isDropTarget = draggingId === s.id
                const isFlashing = highlightId === s.id
                return s.stuck_in_album ? (
                  <div key={s.id} id={slotDomId(s)}>
                    <StickerCard
                      sticker={s}
                      size="mini"
                      className={justStuckId === s.id ? 'fly-to-slot' : ''}
                    />
                  </div>
                ) : (
                  <div
                    key={s.id}
                    id={slotDomId(s)}
                    onClick={() => s.quantity > 0 && stick(s)}
                    onDragOver={(e) => { if (isDropTarget) e.preventDefault() }}
                    onDrop={(e) => {
                      if (!isDropTarget) return
                      e.preventDefault()
                      stick(s)
                    }}
                    className={`relative flex h-[110px] w-[80px] flex-col items-center justify-center rounded-[4px] border-2 border-dashed transition ${
                      isDropTarget || isFlashing
                        ? 'animate-pulse border-emerald-400 bg-emerald-50 ring-4 ring-emerald-300/70'
                        : 'border-panini-gold bg-white/40'
                    } ${s.quantity > 0 ? 'cursor-pointer hover:bg-amber-50' : ''}`}
                  >
                    <span className="font-display text-lg font-black text-panini-gold">
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
              })}
            </div>
          </div>
        </section>

        {teams.map((t) => (
          <TeamSpread
            key={t.team}
            team={t.team}
            groupName={t.groupName}
            teamColor={t.color}
            teamCode={t.code}
            stickers={t.stickers}
            onStick={stick}
            justStuckId={justStuckId}
            draggingId={draggingId}
            highlightId={highlightId}
            selectedId={selectedId}
            onSlotTap={handleSlotTap}
          />
        ))}
      </div>
    </div>
    </>
  )
}
