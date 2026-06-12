import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../store/auth'
import type { UserRow } from '../types'
import { GeoBackground } from '../components/branding/GeoBackground'
import { Wc26Logo, PaniniLogo } from '../components/branding/Wc26Logo'

export default function Landing() {
  const token = useAuth((s) => s.token)
  const [rows, setRows] = useState<UserRow[]>([])

  useEffect(() => {
    api.leaderboard().then((r) => setRows(r.users)).catch(() => {})
  }, [])

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Album cover replica */}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-r-xl rounded-l-sm shadow-2xl ring-1 ring-black/20">
        <GeoBackground />
        <div className="absolute inset-x-0 top-8 bg-panini-blue py-2 text-center font-display text-sm font-black uppercase tracking-widest text-white">
          Official Sticker Collection
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Wc26Logo className="text-[9rem] text-panini-navy drop-shadow-lg" />
        </div>
        <div className="absolute bottom-6 left-5 text-panini-navy">
          <div className="font-display text-xl font-black uppercase leading-none">
            FIFA World Cup 2026™
          </div>
          <PaniniLogo className="mt-2 text-sm" />
        </div>
        {/* book spine highlight */}
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent" />
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-black uppercase text-panini-navy">
            Виртуальный альбом наклеек
          </h1>
          <p className="mt-2 text-slate-600">
            1313 наклеек, все 48 сборных ЧМ-2026. Открывай пакетики, заполняй
            альбом, меняйся дублями с друзьями.
          </p>
          <div className="mt-4 flex gap-3">
            {token ? (
              <>
                <Link to="/packs" className="rounded-lg bg-panini-coral px-5 py-2.5 font-bold text-white shadow hover:brightness-110">
                  Открыть пакетики
                </Link>
                <Link to="/album" className="rounded-lg bg-panini-blue px-5 py-2.5 font-bold text-white shadow hover:brightness-110">
                  Мой альбом
                </Link>
              </>
            ) : (
              <Link to="/register" className="rounded-lg bg-panini-coral px-5 py-2.5 font-bold text-white shadow hover:brightness-110">
                Начать коллекцию
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="mb-3 font-display text-lg font-black uppercase text-panini-navy">
            🏆 Топ коллекционеров
          </h2>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">Пока никто не наклеил ни одной наклейки.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {rows.map((u, i) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pr-2 font-display font-black text-slate-400">{i + 1}</td>
                    <td className="py-1.5 font-semibold">
                      <Link to={`/users/${u.id}`} className="hover:text-panini-blue hover:underline">
                        {u.username}
                      </Link>
                    </td>
                    <td className="py-1.5 text-right text-slate-500">
                      {u.stuck} / {u.total}
                    </td>
                    <td className="w-28 py-1.5 pl-3">
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-panini-teal"
                          style={{ width: `${Math.min(100, u.percent)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
