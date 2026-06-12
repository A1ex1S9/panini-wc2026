CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    pack_cooldown_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sticker_number INT UNIQUE NOT NULL,
    player_name TEXT NOT NULL DEFAULT '',
    player_lastname TEXT NOT NULL DEFAULT '',
    position VARCHAR(3),
    team VARCHAR(100) NOT NULL,
    team_color VARCHAR(7) NOT NULL DEFAULT '#1A3C6E',
    group_name VARCHAR(10),
    dob DATE,
    height_cm INT,
    weight_kg INT,
    club TEXT,
    photo_url TEXT,
    rarity VARCHAR(10) NOT NULL DEFAULT 'common',
    is_special BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_stickers_team ON stickers (team);
CREATE INDEX IF NOT EXISTS idx_stickers_rarity ON stickers (rarity);

CREATE TABLE IF NOT EXISTS user_stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    sticker_id UUID NOT NULL REFERENCES stickers (id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    stuck_in_album BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (user_id, sticker_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stickers_user ON user_stickers (user_id);

CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    offered_sticker_id UUID NOT NULL REFERENCES stickers (id),
    requested_sticker_id UUID NOT NULL REFERENCES stickers (id),
    status VARCHAR(10) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_to_user ON trades (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_from_user ON trades (from_user_id, status);
