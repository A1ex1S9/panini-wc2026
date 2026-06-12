import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../store/auth'
import type { InventoryItem, Trade as TradeT, UserRow } from '../types'
import { StickerCard } from '../components/StickerCard/StickerCard'
import { TradeModal } from '../components/TradeModal/TradeModal'

type Tab = 'browse' | 'my'

export default function Trade() {
  const me = useAuth((s) => s.user)
  const [tab, setTab] = useState<Tab>('browse')
  const [users, setUsers] = useState<UserRow[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [theirItems, setTheirItems] = useState<InventoryItem[]>([])
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null)
  const [trades, setTrades] = useState<TradeT[]>([])
  const [notice, setNotice] = useState('')

  const loadTrades = useCallback(async () => {
    try {
      const { trades } = await api.trades()
      setTrades(trades)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    api.users().then(({ users }) => setUsers(users)).catch(() => {})
    loadTrades()
    // real-time-ish: poll for new incoming offers every 10s
    const id = setInterval(loadTrades, 10_000)
    return () => clearInterval(id)
  }, [loadTrades])

  const openUser = async (u: UserRow) => {
    setSelected(u)
    setTheirItems([])
    const { items } = await api.userInventory(u.id)
    setTheirItems(items.filter((i) => i.spare_quantity > 0))
  }

  const incoming = trades.filter((t) => t.to_user_id === me?.id)
  const outgoing = trades.filter((t) => t.from_user_id === me?.id)

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      await fn()
      setNotice(okMsg)
      setTimeout(() => setNotice(''), 3000)
      loadTrades()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка')
      loadTrades()
    }
  }

  const filteredUsers = users.filter(
    (u) => u.id !== me?.id && u.username.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-2xl font-black uppercase text-panini-navy">Обмен</h1>
        <div className="flex rounded-lg bg-slate-200 p-1 text-sm font-bold">
          <button
            onClick={() => setTab('browse')}
            className={`rounded-md px-4 py-1.5 ${tab === 'browse' ? 'bg-white shadow' : 'text-slate-500'}`}
          >
            Коллекционеры
          </button>
          <button
            onClick={() => setTab('my')}
            className={`relative rounded-md px-4 py-1.5 ${tab === 'my' ? 'bg-white shadow' : 'text-slate-500'}`}
          >
            Мои обмены
            {incoming.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">
                {incoming.length}
              </span>
            )}
          </button>
        </div>
        {notice && <span className="text-sm font-semibold text-emerald-600">{notice}</span>}
      </div>

      {tab === 'browse' && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl bg-white p-4 shadow">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени…"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-panini-blue focus:outline-none"
            />
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openUser(u)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100 ${
                    selected?.id === u.id ? 'bg-panini-blue/10 text-panini-blue' : ''
                  }`}
                >
                  <span>{u.username}</span>
                  <span className="text-xs text-slate-400">{u.stuck}/{u.total}</span>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-400">Никого не нашли.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            {selected ? (
              <>
                <div className="mb-3 flex items-baseline gap-3">
                  <h2 className="font-display text-lg font-black uppercase text-panini-navy">
                    Дубли {selected.username}
                  </h2>
                  <Link
                    to={`/users/${selected.id}`}
                    className="text-sm font-semibold text-panini-blue hover:underline"
                  >
                    Смотреть альбом →
                  </Link>
                </div>
                {theirItems.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    У этого коллекционера нет дублей.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {theirItems.map((item) => (
                      <StickerCard
                        key={item.id}
                        sticker={item.sticker}
                        size="mini"
                        onClick={() => setModalItem(item)}
                        className="hover:-translate-y-1 transition-transform"
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="py-16 text-center text-sm text-slate-400">
                Выбери коллекционера слева, чтобы посмотреть его дубли.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'my' && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 font-display text-lg font-black uppercase text-panini-navy">
              Входящие ({incoming.length})
            </h2>
            {incoming.length === 0 && (
              <p className="text-sm text-slate-400">Нет входящих предложений.</p>
            )}
            <div className="space-y-4">
              {incoming.map((t) => (
                <div key={t.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-sm">
                    <b>{t.from_user?.username}</b> предлагает обмен:
                  </p>
                  <div className="flex items-center gap-3">
                    {t.offered_sticker && <StickerCard sticker={t.offered_sticker} size="mini" />}
                    <span className="font-display text-xl font-black text-slate-300">→</span>
                    {t.requested_sticker && <StickerCard sticker={t.requested_sticker} size="mini" />}
                    <div className="ml-auto flex flex-col gap-2">
                      <button
                        onClick={() => act(() => api.acceptTrade(t.id), 'Обмен совершён! 🎉')}
                        className="rounded bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white hover:brightness-110"
                      >
                        Принять
                      </button>
                      <button
                        onClick={() => act(() => api.declineTrade(t.id), 'Предложение отклонено')}
                        className="rounded bg-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-300"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Ты отдаёшь правую, получаешь левую.
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 font-display text-lg font-black uppercase text-panini-navy">
              Исходящие ({outgoing.length})
            </h2>
            {outgoing.length === 0 && (
              <p className="text-sm text-slate-400">Ты пока ничего не предложил.</p>
            )}
            <div className="space-y-4">
              {outgoing.map((t) => (
                <div key={t.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-sm">
                    Ждём ответа от <b>{t.to_user?.username}</b>:
                  </p>
                  <div className="flex items-center gap-3">
                    {t.offered_sticker && <StickerCard sticker={t.offered_sticker} size="mini" />}
                    <span className="font-display text-xl font-black text-slate-300">→</span>
                    {t.requested_sticker && <StickerCard sticker={t.requested_sticker} size="mini" />}
                    <button
                      onClick={() => act(() => api.cancelTrade(t.id), 'Предложение отменено')}
                      className="ml-auto rounded bg-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-300"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {modalItem && selected && (
        <TradeModal
          targetUserId={selected.id}
          targetUsername={selected.username}
          requested={modalItem.sticker}
          onClose={() => setModalItem(null)}
          onCreated={() => {
            setModalItem(null)
            setNotice('Предложение отправлено! ✉️')
            setTimeout(() => setNotice(''), 3000)
            loadTrades()
          }}
        />
      )}
    </div>
  )
}
