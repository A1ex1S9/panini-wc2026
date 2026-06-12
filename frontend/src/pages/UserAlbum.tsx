import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AlbumSticker, User } from '../types'
import { TeamSpread } from '../components/AlbumPage/TeamSpread'
import { groupByTeam } from './Album'

export default function UserAlbum() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [stickers, setStickers] = useState<AlbumSticker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.userAlbum(id)
      .then((r) => { setUser(r.user); setStickers(r.stickers) })
      .finally(() => setLoading(false))
  }, [id])

  const { teams } = useMemo(() => groupByTeam(stickers), [stickers])
  const stuck = stickers.filter((s) => s.stuck_in_album).length

  if (loading) return <p className="py-20 text-center text-slate-400">Загружаем…</p>
  if (!user) return <p className="py-20 text-center text-slate-400">Пользователь не найден.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="font-display text-2xl font-black uppercase text-panini-navy">
          Альбом {user.username}
        </h1>
        <span className="text-sm font-semibold text-slate-500">
          {stuck} / {stickers.length} наклеек
        </span>
        <Link to="/trade" className="ml-auto text-sm font-semibold text-panini-blue hover:underline">
          Предложить обмен →
        </Link>
      </div>
      <div className="space-y-8">
        {teams.map((t) => (
          <TeamSpread
            key={t.team}
            team={t.team}
            groupName={t.groupName}
            teamColor={t.color}
            teamCode={t.code}
            stickers={t.stickers}
            readonly
          />
        ))}
      </div>
    </div>
  )
}
