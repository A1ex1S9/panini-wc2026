export interface Sticker {
  id: string
  sticker_number: number
  player_name: string
  player_lastname: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD' | ''
  team: string
  team_color: string
  group_name: string
  team_code: string
  dob: string | null
  height_cm: number | null
  weight_kg: number | null
  club: string
  photo_url: string
  rarity: 'common' | 'rare' | 'legend'
  is_special: boolean
}

export interface AlbumSticker extends Sticker {
  quantity: number
  stuck_in_album: boolean
}

export interface RevealedSticker extends Sticker {
  is_new: boolean
  quantity: number
}

export interface User {
  id: string
  username: string
  email?: string
  created_at?: string
}

export interface UserRow {
  id: string
  username: string
  stuck: number
  total: number
  percent: number
}

export interface InventoryItem {
  id: string
  user_id: string
  sticker_id: string
  quantity: number
  stuck_in_album: boolean
  spare_quantity: number
  sticker: Sticker
}

export interface Trade {
  id: string
  from_user_id: string
  to_user_id: string
  offered_sticker_id: string
  requested_sticker_id: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at: string
  from_user?: User
  to_user?: User
  offered_sticker?: Sticker
  requested_sticker?: Sticker
}

export interface PacksStatus {
  packs_available: number
  cooldown_seconds: number
  stickers_per_pack: number
  packs_per_cooldown: number
}

export interface TeamProgress {
  team: string
  total: number
  stuck: number
}

export interface Progress {
  total: number
  stuck: number
  percent: number
  per_team: TeamProgress[]
}
