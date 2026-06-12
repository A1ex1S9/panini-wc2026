package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Username          string     `json:"username" gorm:"uniqueIndex;size:50"`
	Email             string     `json:"email" gorm:"uniqueIndex;size:255"`
	PasswordHash      string     `json:"-"`
	PackCooldownUntil *time.Time `json:"pack_cooldown_until"`
	CreatedAt         time.Time  `json:"created_at"`
}

type Sticker struct {
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	StickerNumber  int        `json:"sticker_number" gorm:"uniqueIndex"`
	PlayerName     string     `json:"player_name"`
	PlayerLastname string     `json:"player_lastname"`
	Position       string     `json:"position" gorm:"size:3"`
	Team           string     `json:"team" gorm:"size:100"`
	TeamColor      string     `json:"team_color" gorm:"size:7"`
	GroupName      string     `json:"group_name" gorm:"size:10"`
	DOB            *time.Time `json:"dob" gorm:"column:dob;type:date"`
	HeightCM       *int       `json:"height_cm" gorm:"column:height_cm"`
	WeightKG       *int       `json:"weight_kg" gorm:"column:weight_kg"`
	Club           string     `json:"club"`
	PhotoURL       string     `json:"photo_url"`
	Rarity         string     `json:"rarity" gorm:"size:10;default:common"`
	IsSpecial      bool       `json:"is_special"`
}

type UserSticker struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID       uuid.UUID `json:"user_id" gorm:"type:uuid;index"`
	StickerID    uuid.UUID `json:"sticker_id" gorm:"type:uuid"`
	Quantity     int       `json:"quantity"`
	StuckInAlbum bool      `json:"stuck_in_album"`
	Sticker      *Sticker  `json:"sticker,omitempty" gorm:"foreignKey:StickerID"`
}

const (
	TradePending   = "pending"
	TradeAccepted  = "accepted"
	TradeDeclined  = "declined"
	TradeCancelled = "cancelled"
)

type Trade struct {
	ID                 uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	FromUserID         uuid.UUID `json:"from_user_id" gorm:"type:uuid"`
	ToUserID           uuid.UUID `json:"to_user_id" gorm:"type:uuid"`
	OfferedStickerID   uuid.UUID `json:"offered_sticker_id" gorm:"type:uuid"`
	RequestedStickerID uuid.UUID `json:"requested_sticker_id" gorm:"type:uuid"`
	Status             string    `json:"status" gorm:"size:10;default:pending"`
	CreatedAt          time.Time `json:"created_at"`

	FromUser         *User    `json:"from_user,omitempty" gorm:"foreignKey:FromUserID"`
	ToUser           *User    `json:"to_user,omitempty" gorm:"foreignKey:ToUserID"`
	OfferedSticker   *Sticker `json:"offered_sticker,omitempty" gorm:"foreignKey:OfferedStickerID"`
	RequestedSticker *Sticker `json:"requested_sticker,omitempty" gorm:"foreignKey:RequestedStickerID"`
}
