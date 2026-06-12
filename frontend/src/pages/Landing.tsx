import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../store/auth'
import type { UserRow } from '../types'
import { Mosaic } from '../components/branding/Mosaic'
import { Wc26Lockup, PaniniLogo } from '../components/branding/Wc26Logo'

export default function Landing() {
  const token = useAuth((s) => s.token)
  const [rows, setRows] = useState<UserRow[]>([])

  useEffect(() => {
    api.leaderboard().then((r) => setRows(r.users)).catch(() => {})
  }, [])

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Album cover, mosaic style */}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-r-lg rounded-l-sm shadow-2xl ring-1 ring-black/20">
        <Mosaic seed={5} cols={8} rows={11} />
        <div className="absolute inset-x-0 top-5 text-center font-display text-sm font-black uppercase tracking-[0.25em] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
          Official Sticker Collection
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Wc26Lockup className="text-[2.6rem] drop-shadow-[0_4px_14px_rgba(0,0,0,0.5)]" />
        </div>
        <PaniniLogo className="absolute bottom-5 left-5 rounded-sm text-base" />
        {/* page block + book spine */}
        <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-l from-white/50 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/35 to-transparent" />
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
