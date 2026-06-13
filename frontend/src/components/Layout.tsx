import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { api } from '../api/client'
import { Wc26Stack } from './branding/Wc26Logo'

const navItems = [
  { to: '/album', label: 'Альбом' },
  { to: '/packs', label: 'Пакетики' },
  { to: '/inventory', label: 'Инвентарь' },
  { to: '/trade', label: 'Обмен' },
]

export function Layout() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const [incoming, setIncoming] = useState(0)

  // poll for incoming trade offers to show a badge on the nav
  useEffect(() => {
    if (!token || !user) return
    let alive = true
    const tick = async () => {
      try {
        const { trades } = await api.trades()
        if (alive) setIncoming(trades.filter((t) => t.to_user_id === user.id).length)
      } catch { /* ignore */ }
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => { alive = false; clearInterval(id) }
  }, [token, user])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-panini-navy text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:gap-6 sm:px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Wc26Stack className="text-xl" trophy={false} />
            <span className="hidden font-display text-sm font-black uppercase leading-tight sm:block">
              FIFA World Cup 2026™<br />
              <span className="text-[10px] font-bold text-white/60">Virtual Sticker Album</span>
            </span>
          </Link>
          {token && (
            <nav className="flex flex-1 gap-0.5 text-xs font-semibold sm:gap-1 sm:text-sm">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative rounded px-2 py-1.5 transition sm:px-3 ${
                      isActive ? 'bg-white/20' : 'hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                  {item.to === '/trade' && incoming > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black">
                      {incoming}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2 text-xs sm:gap-3 sm:text-sm">
            {token && user ? (
              <>
                <span className="hidden font-semibold text-white/80 sm:block">{user.username}</span>
                <button
                  onClick={() => { logout(); navigate('/') }}
                  className="rounded bg-white/10 px-2 py-1.5 font-semibold hover:bg-white/20 sm:px-3"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded px-2 py-1.5 font-semibold hover:bg-white/10 sm:px-3">
                  Войти
                </Link>
                <Link
                  to="/register"
                  className="rounded bg-panini-coral px-2 py-1.5 font-bold hover:brightness-110 sm:px-3"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-2 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Fan project · player data &amp; photos from Wikipedia · not affiliated with Panini or FIFA
      </footer>
    </div>
  )
}
