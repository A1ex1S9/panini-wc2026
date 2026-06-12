import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { InventoryItem } from '../types'
import { StickerCard } from '../components/StickerCard/StickerCard'

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { items } = await api.inventory()
      setItems(items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stick = async (item: InventoryItem) => {
    try {
      await api.stick(item.sticker_id)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не получилось наклеить')
    }
  }

  if (loading) return <p className="py-20 text-center text-slate-400">Загружаем…</p>

  const unstuck = items.filter((i) => !i.stuck_in_album)
  const dupes = items.filter((i) => i.stuck_in_album)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-black uppercase text-panini-navy">Инвентарь</h1>
        <p className="text-sm text-slate-500">
          Наклейки, которые ещё не в альбоме, и дубли для обмена.{' '}
          <Link to="/trade" className="font-semibold text-panini-blue hover:underline">
            Обменяться →
          </Link>
        </p>
      </div>

      {items.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow">
          <p className="text-slate-400">
            Пусто. <Link to="/packs" className="font-semibold text-panini-blue hover:underline">Открой пакетик!</Link>
          </p>
        </div>
      )}

      {unstuck.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-black uppercase text-panini-navy">
            Можно наклеить ({unstuck.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {unstuck.map((item) => (
              <div key={item.id} className="flex flex-col items-center gap-1.5">
                <StickerCard
                  sticker={item.sticker}
                  size="normal"
                  isDuplicate={item.quantity > 1}
                  duplicateCount={item.quantity}
                />
                <button
                  onClick={() => stick(item)}
                  className="rounded bg-panini-teal px-3 py-1 text-xs font-bold text-white hover:brightness-110"
                >
                  Наклеить в альбом
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {dupes.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-black uppercase text-panini-navy">
            Дубли для обмена ({dupes.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {dupes.map((item) => (
              <StickerCard
                key={item.id}
                sticker={item.sticker}
                size="normal"
                isDuplicate
                duplicateCount={item.spare_quantity + 1}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
