import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { AlbumSticker } from '../types'
import { TeamSpread } from '../components/AlbumPage/TeamSpread'
import { StickerCard } from '../components/StickerCard/StickerCard'
import { Flag } from '../components/branding/Flag'

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

export default function Album() {
  const [stickers, setStickers] = useState<AlbumSticker[]>([])
  const [loading, setLoading] = useState(true)
  const [justStuckId, setJustStuckId] = useState<string | null>(null)

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

  const stick = async (s: AlbumSticker) => {
    try {
      await api.stick(s.id)
      setJustStuckId(s.id)
      setStickers((prev) =>
        prev.map((p) => (p.id === s.id ? { ...p, stuck_in_album: true } : p)))
      setTimeout(() => setJustStuckId(null), 800)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не получилось наклеить')
    }
  }

  if (loading) {
    return <p className="py-20 text-center text-slate-400">Загружаем альбом…</p>
  }

  return (
    <div className="flex gap-6">
      {/* sidebar: team list with completion */}
      <aside className="sticky top-16 hidden max-h-[calc(100vh-5rem)] w-56 shrink-0 overflow-y-auto rounded-xl bg-white p-3 shadow lg:block">
        <div className="mb-2 px-2 font-display text-sm font-black uppercase text-panini-navy">
          Альбом · {totalStuck}/{stickers.length}
        </div>
        <a
          href="#specials"
          className="block rounded px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          ⭐ Специальные
        </a>
        {teams.map((t) => (
          <a
            key={t.team}
            href={`#team-${t.team.replace(/\s+/g, '-')}`}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            <Flag code={t.code} className="h-3.5 w-5" />
            <span className="truncate">{t.team}</span>
            <span
              className={`ml-auto text-xs font-bold ${
                t.stuck === t.stickers.length ? 'text-emerald-500' : 'text-slate-400'
              }`}
            >
              {t.stuck}/{t.stickers.length}
            </span>
          </a>
        ))}
      </aside>

      {/* album spreads */}
      <div className="min-w-0 flex-1 space-y-8">
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
              {specials.map((s) =>
                s.stuck_in_album ? (
                  <StickerCard
                    key={s.id}
                    sticker={s}
                    size="mini"
                    className={justStuckId === s.id ? 'fly-to-slot' : ''}
                  />
                ) : (
                  <div
                    key={s.id}
                    onClick={() => s.quantity > 0 && stick(s)}
                    className={`relative flex h-[110px] w-[80px] flex-col items-center justify-center rounded-md border-2 border-dashed border-panini-gold bg-white/40 ${
                      s.quantity > 0 ? 'cursor-pointer hover:bg-amber-50' : ''
                    }`}
                  >
                    <span className="font-display text-lg font-black text-panini-gold">
                      {s.sticker_number}
                    </span>
                    <span className="px-1 text-center text-[9px] font-semibold text-slate-400">
                      {s.player_lastname}
                    </span>
                    {s.quantity > 0 && (
                      <span className="absolute bottom-1 rounded bg-emerald-500 px-1 text-[9px] font-black text-white">
                        ЕСТЬ ✓
                      </span>
                    )}
                  </div>
                ),
              )}
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
          />
        ))}
      </div>
    </div>
  )
}
