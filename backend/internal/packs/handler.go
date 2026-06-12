package packs

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"panini-wc2026/backend/internal/middleware"
	"panini-wc2026/backend/internal/models"
)

const (
	PacksPerCycle   = 5
	StickersPerPack = 5
	CooldownSeconds = 86400
)

type Handler struct {
	DB    *gorm.DB
	Redis *redis.Client
}

func cooldownKey(userID uuid.UUID) string {
	return fmt.Sprintf("pack_cooldown:%s", userID)
}

type packsState struct {
	PacksAvailable   int `json:"packs_available"`
	CooldownSeconds  int `json:"cooldown_seconds"`
	StickersPerPack  int `json:"stickers_per_pack"`
	PacksPerCooldown int `json:"packs_per_cooldown"`
}

// state reads the Redis counter: the key holds packs remaining in the current
// 24h cycle; a missing key means a fresh cycle with the full allowance.
func (h *Handler) state(ctx context.Context, userID uuid.UUID) (packsState, error) {
	s := packsState{
		PacksAvailable:   PacksPerCycle,
		StickersPerPack:  StickersPerPack,
		PacksPerCooldown: PacksPerCycle,
	}
	val, err := h.Redis.Get(ctx, cooldownKey(userID)).Int()
	if err == redis.Nil {
		return s, nil
	}
	if err != nil {
		return s, err
	}
	s.PacksAvailable = val
	if val <= 0 {
		ttl, err := h.Redis.TTL(ctx, cooldownKey(userID)).Result()
		if err == nil && ttl > 0 {
			s.CooldownSeconds = int(ttl.Seconds())
		}
	}
	return s, nil
}

func (h *Handler) Status(c *gin.Context) {
	s, err := h.state(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cache failure"})
		return
	}
	c.JSON(http.StatusOK, s)
}

type revealedSticker struct {
	models.Sticker
	IsNew    bool `json:"is_new"`
	Quantity int  `json:"quantity"`
}

func (h *Handler) Open(c *gin.Context) {
	ctx := c.Request.Context()
	userID := middleware.UserID(c)

	s, err := h.state(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cache failure"})
		return
	}
	if s.PacksAvailable <= 0 {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":            "no packs left",
			"cooldown_seconds": s.CooldownSeconds,
		})
		return
	}

	drawn, err := h.drawStickers(StickersPerPack)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "draw failure"})
		return
	}

	revealed := make([]revealedSticker, 0, len(drawn))
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		for _, st := range drawn {
			var us models.UserSticker
			err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("user_id = ? AND sticker_id = ?", userID, st.ID).
				First(&us).Error
			isNew := err == gorm.ErrRecordNotFound
			if isNew {
				us = models.UserSticker{UserID: userID, StickerID: st.ID, Quantity: 1}
				if err := tx.Create(&us).Error; err != nil {
					return err
				}
			} else if err != nil {
				return err
			} else {
				us.Quantity++
				if err := tx.Model(&us).Update("quantity", us.Quantity).Error; err != nil {
					return err
				}
			}
			revealed = append(revealed, revealedSticker{Sticker: st, IsNew: isNew, Quantity: us.Quantity})
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save pack"})
		return
	}

	// Decrement the cycle counter; the key carries the 24h cooldown TTL.
	remaining := s.PacksAvailable - 1
	if err := h.Redis.Set(ctx, cooldownKey(userID), remaining,
		time.Duration(CooldownSeconds)*time.Second).Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cache failure"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stickers":        revealed,
		"packs_available": remaining,
	})
}

// drawStickers picks rarities by weight (70/25/5) and a random sticker of
// that rarity for each slot. Falls back to common when a tier is empty.
func (h *Handler) drawStickers(n int) ([]models.Sticker, error) {
	out := make([]models.Sticker, 0, n)
	for i := 0; i < n; i++ {
		rarity := rollRarity()
		var st models.Sticker
		err := h.DB.Where("rarity = ?", rarity).Order("RANDOM()").First(&st).Error
		if err == gorm.ErrRecordNotFound {
			err = h.DB.Order("RANDOM()").First(&st).Error
		}
		if err != nil {
			return nil, err
		}
		out = append(out, st)
	}
	return out, nil
}

func rollRarity() string {
	switch r := rand.Intn(100); {
	case r < 5:
		return "legend"
	case r < 30:
		return "rare"
	default:
		return "common"
	}
}
