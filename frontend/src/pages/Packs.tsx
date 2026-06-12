import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { PacksStatus, RevealedSticker } from '../types'
import { PackVisual, CardBack } from '../components/PackOpener/PackVisual'
import { StickerCard } from '../components/StickerCard/StickerCard'

type Phase = 'idle' | 'tearing' | 'revealing'

function fmtCooldown(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${h}ч ${String(m).padStart(2, '0')}м ${String(s).padStart(2, '0')}с`
}

function GoldParticles() {
  const parts = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2
    const dist = 60 + (i % 3) * 25
    return {
      px: `${Math.cos(angle) * dist}px`,
      py: `${Math.sin(angle) * dist}px`,
      pd: `${0.4 + (i % 5) * 0.05}s`,
    }
  })
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      {parts.map((p, i) => (
        <span
          key={i}
          className="particle absolute h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_6px_2px_rgba(255,215,0,0.8)]"
          style={{ '--px': p.px, '--py': p.py, '--pd': p.pd } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

export default function Packs() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<PacksStatus | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [cards, setCards] = useState<RevealedSticker[]>([])
  const [flipped, setFlipped] = useState<Set<number>>(new Set())
  const [cooldown, setCooldown] = useState(0)
  const [busy, setBusy] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.packsStatus()
      setStatus(s)
      setCooldown(s.cooldown_seconds)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  // tick down the cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown > 0])

  const openPack = async () => {
    if (busy || !status || status.packs_available <= 0) return
    setBusy(true)
    setPhase('tearing')
    try {
      const [res] = await Promise.all([
        api.openPack(),
        new Promise((r) => setTimeout(r, 600)), // let the tear animation play
      ])
      setCards(res.stickers)
      setFlipped(new Set())
      setStatus((s) => (s ? { ...s, packs_available: res.packs_available } : s))
      setPhase('revealing')
      if (res.packs_available === 0) loadStatus()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не получилось открыть пакетик')
      setPhase('idle')
      loadStatus()
    } finally {
      setBusy(false)
    }
  }

  const allFlipped = cards.length > 0 && flipped.size === cards.length

  const stickAllNew = async () => {
    const newOnes = cards.filter((c) => c.is_new)
    await Promise.allSettled(newOnes.map((c) => api.stick(c.id)))
    navigate('/album')
  }

  const packs = status?.packs_available ?? 0

  return (
    <div className="flex flex-col items-center">
      <h1 className="mb-1 font-display text-2xl font-black uppercase text-panini-navy">
        Пакетики
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        {packs > 0
          ? `Осталось пакетиков: ${packs} · в каждом ${status?.stickers_per_pack ?? 5} наклеек`
          : 'Пакетики закончились'}
      </p>

      {phase !== 'revealing' && (
        packs > 0 ? (
          /* pack stack: overlapping packs with slight rotation */
          <div className="relative h-80 w-60">
            {Array.from({ length: Math.min(packs, 4) }, (_, i) => i).reverse().map((i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-transform ${
                  i === 0
                    ? `cursor-pointer hover:-translate-y-3 ${phase === 'tearing' ? 'pack-tear' : ''}`
                    : ''
                }`}
                style={{
                  transform: `rotate(${i * 4 - 2}deg) translate(${i * 6}px, ${i * 4}px)`,
                  zIndex: 10 - i,
                }}
                onClick={i === 0 ? openPack : undefined}
              >
                <PackVisual className="h-full w-full" />
              </div>
            ))}
            {phase === 'idle' && (
              <div className="absolute -bottom-10 inset-x-0 text-center text-sm font-semibold text-slate-400">
                Нажми на пакетик, чтобы открыть
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-white px-10 py-12 text-center shadow">
            <div className="text-4xl">⏳</div>
            <p className="mt-3 font-display text-lg font-black uppercase text-panini-navy">
              Новые пакетики через
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-panini-coral">
              {fmtCooldown(cooldown)}
            </p>
          </div>
        )
      )}

      {phase === 'revealing' && (
        <>
          <div className="flex flex-wrap justify-center gap-4">
            {cards.map((card, i) => {
              const isFlipped = flipped.has(i)
              return (
                <div
                  key={`${card.id}-${i}`}
                  className="flip-scene card-enter relative h-[220px] w-[160px] cursor-pointer"
                  style={{ animationDelay: `${i * 0.12}s` }}
                  onClick={() => setFlipped((f) => new Set(f).add(i))}
                >
                  <div className={`flip-inner relative h-full w-full ${isFlipped ? 'flipped' : ''}`}>
                    <div className="flip-face">
                      <CardBack />
                    </div>
                    <div className="flip-face flip-front">
                      <StickerCard
                        sticker={card}
                        size="normal"
                        isNew={isFlipped && card.is_new}
                        isDuplicate={isFlipped && !card.is_new}
                        duplicateCount={card.quantity}
                        className={
                          isFlipped && card.rarity === 'legend' ? 'gold-burst' : ''
                        }
                      />
                      {isFlipped && card.rarity === 'legend' && <GoldParticles />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-sm text-slate-400">
            {allFlipped ? 'Все наклейки открыты!' : 'Кликай по карточкам, чтобы перевернуть'}
          </p>
          {allFlipped && (
            <div className="mt-4 flex gap-3">
              {cards.some((c) => c.is_new) && (
                <button
                  onClick={stickAllNew}
                  className="rounded-lg bg-panini-teal px-5 py-2.5 font-bold text-white shadow hover:brightness-110"
                >
                  Наклеить новые ({cards.filter((c) => c.is_new).length})
                </button>
              )}
              <button
                onClick={() => { setPhase('idle'); setCards([]) }}
                className="rounded-lg bg-slate-200 px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-300"
              >
                В инвентарь
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
