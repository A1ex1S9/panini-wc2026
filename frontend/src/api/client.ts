import { useAuth } from '../store/auth'
import type {
  AlbumSticker, InventoryItem, PacksStatus, Progress, RevealedSticker,
  Trade, User, UserRow,
} from '../types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuth.getState().token
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) useAuth.getState().logout()
    throw new ApiError(res.status, body.error || res.statusText)
  }
  return body as T
}

export const api = {
  register: (username: string, email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  album: () => request<{ stickers: AlbumSticker[] }>('/api/album'),
  userAlbum: (id: string) =>
    request<{ user: User; stickers: AlbumSticker[] }>(`/api/users/${id}/album`),
  progress: () => request<Progress>('/api/album/progress'),

  packsStatus: () => request<PacksStatus>('/api/packs/status'),
  openPack: () =>
    request<{ stickers: RevealedSticker[]; packs_available: number }>(
      '/api/packs/open', { method: 'POST' }),

  stick: (stickerId: string) =>
    request<unknown>(`/api/stickers/${stickerId}/stick`, { method: 'POST' }),
  inventory: () => request<{ items: InventoryItem[] }>('/api/inventory'),
  userInventory: (id: string) =>
    request<{ items: InventoryItem[] }>(`/api/users/${id}/inventory`),

  users: () => request<{ users: UserRow[] }>('/api/users'),
  leaderboard: () => request<{ users: UserRow[] }>('/api/leaderboard'),

  trades: () => request<{ trades: Trade[] }>('/api/trades'),
  createTrade: (toUserId: string, offeredStickerId: string, requestedStickerId: string) =>
    request<Trade>('/api/trades', {
      method: 'POST',
      body: JSON.stringify({
        to_user_id: toUserId,
        offered_sticker_id: offeredStickerId,
        requested_sticker_id: requestedStickerId,
      }),
    }),
  acceptTrade: (id: string) => request<Trade>(`/api/trades/${id}/accept`, { method: 'PUT' }),
  declineTrade: (id: string) => request<Trade>(`/api/trades/${id}/decline`, { method: 'PUT' }),
  cancelTrade: (id: string) => request<Trade>(`/api/trades/${id}`, { method: 'DELETE' }),
}
