import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { InventoryItem, Sticker } from '../../types'
import { StickerCard } from '../StickerCard/StickerCard'

interface TradeModalProps {
  targetUserId: string
  targetUsername: string
  requested: Sticker // the sticker you want from them
  onClose: () => void
  onCreated: () => void
}

export function TradeModal({
  targetUserId, targetUsername, requested, onClose, onCreated,
}: TradeModalProps) {
  const [myItems, setMyItems] = useState<InventoryItem[]>([])
  const [offered, setOffered] = useState<InventoryItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.inventory().then(({ items }) =>
      setMyItems(items.filter((i) => i.spare_quantity > 0)))
  }, [])

  const submit = async () => {
    if (!offered) return
    setBusy(true)
    setError('')
    try {
      await api.createTrade(targetUserId, offered.sticker_id, requested.id)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось создать обмен')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-black uppercase text-panini-navy">
          Предложить обмен
        </h2>
        <p className="mb-5 text-sm text-slate-500">с {targetUsername}</p>

        <div className="mb-6 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Ты отдаёшь
            </p>
            {offered ? (
              <StickerCard sticker={offered.sticker} size="normal" />
            ) : (
              <div className="flex h-[220px] w-[160px] items-center justify-center rounded-md border-2 border-dashed border-slate-300 text-xs font-semibold text-slate-400">
                выбери ниже
              </div>
            )}
          </div>
          <div className="font-display text-3xl font-black text-slate-300">←→</div>
          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Ты получаешь
            </p>
            <StickerCard sticker={requested} size="normal" />
          </div>
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          Твои дубли:
        </p>
        {myItems.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-400">
            У тебя нет свободных дублей для обмена.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {myItems.map((item) => (
              <StickerCard
                key={item.id}
                sticker={item.sticker}
                size="mini"
                onClick={() => setOffered(item)}
                className={
                  offered?.id === item.id
                    ? 'outline-3 outline-panini-teal outline-offset-2'
                    : 'opacity-80 hover:opacity-100'
                }
              />
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-300"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={!offered || busy}
            className="rounded-lg bg-panini-coral px-4 py-2 font-bold text-white hover:brightness-110 disabled:opacity-40"
          >
            {busy ? '…' : 'Предложить обмен'}
          </button>
        </div>
      </div>
    </div>
  )
}
