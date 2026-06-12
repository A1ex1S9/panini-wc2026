import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../store/auth'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuth((s) => s.setAuth)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { token, user } = await api.register(username, email, password)
      setAuth(token, user)
      navigate('/packs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-sm rounded-xl bg-white p-8 shadow-lg">
      <h1 className="mb-6 font-display text-2xl font-black text-panini-navy">Регистрация</h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-panini-blue focus:outline-none"
          placeholder="Имя пользователя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          required
        />
        <input
          type="email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-panini-blue focus:outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-panini-blue focus:outline-none"
          placeholder="Пароль (мин. 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-panini-coral py-2.5 font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          {busy ? '…' : 'Создать аккаунт'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="font-semibold text-panini-blue hover:underline">
          Войти
        </Link>
      </p>
    </div>
  )
}
