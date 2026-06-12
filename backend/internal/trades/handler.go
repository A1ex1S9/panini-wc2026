package trades

import (
	"context"
	"errors"
	"fmt"
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

type Handler struct {
	DB    *gorm.DB
	Redis *redis.Client
}

type createRequest struct {
	ToUserID           uuid.UUID `json:"to_user_id" binding:"required"`
	OfferedStickerID   uuid.UUID `json:"offered_sticker_id" binding:"required"`
	RequestedStickerID uuid.UUID `json:"requested_sticker_id" binding:"required"`
}

var errNoSpare = errors.New("no spare copy available")

// spareCopy loads the user_stickers row and checks the user has a copy that
// is not the one stuck in the album. Pass a tx with FOR UPDATE for swaps.
func spareCopy(tx *gorm.DB, userID, stickerID uuid.UUID, lock bool) (*models.UserSticker, error) {
	q := tx
	if lock {
		q = q.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	var us models.UserSticker
	if err := q.Where("user_id = ? AND sticker_id = ?", userID, stickerID).
		First(&us).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errNoSpare
		}
		return nil, err
	}
	spare := us.Quantity
	if us.StuckInAlbum {
		spare--
	}
	if spare < 1 {
		return nil, errNoSpare
	}
	return &us, nil
}

func (h *Handler) Create(c *gin.Context) {
	userID := middleware.UserID(c)
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.ToUserID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot trade with yourself"})
		return
	}
	if _, err := spareCopy(h.DB, userID, req.OfferedStickerID, false); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "you have no spare copy of the offered sticker"})
		return
	}
	if _, err := spareCopy(h.DB, req.ToUserID, req.RequestedStickerID, false); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "that user has no spare copy of the requested sticker"})
		return
	}
	trade := models.Trade{
		FromUserID:         userID,
		ToUserID:           req.ToUserID,
		OfferedStickerID:   req.OfferedStickerID,
		RequestedStickerID: req.RequestedStickerID,
		Status:             models.TradePending,
	}
	if err := h.DB.Create(&trade).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create trade"})
		return
	}
	c.JSON(http.StatusCreated, trade)
}

// List returns the caller's pending trades, both sent and received.
func (h *Handler) List(c *gin.Context) {
	userID := middleware.UserID(c)
	var trades []models.Trade
	err := h.DB.
		Preload("FromUser").Preload("ToUser").
		Preload("OfferedSticker").Preload("RequestedSticker").
		Where("(from_user_id = ? OR to_user_id = ?) AND status = ?",
			userID, userID, models.TradePending).
		Order("created_at DESC").
		Find(&trades).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load trades"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"trades": trades})
}

// Accept performs the swap inside one transaction, guarded by a Redis lock
// per trade so a double-click cannot execute it twice.
func (h *Handler) Accept(c *gin.Context) {
	userID := middleware.UserID(c)
	tradeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid trade id"})
		return
	}

	ctx := c.Request.Context()
	lockKey := fmt.Sprintf("trade_lock:%s", tradeID)
	ok, err := h.Redis.SetNX(ctx, lockKey, userID.String(), 10*time.Second).Result()
	if err != nil || !ok {
		c.JSON(http.StatusConflict, gin.H{"error": "trade is being processed"})
		return
	}
	defer h.Redis.Del(context.Background(), lockKey)

	var trade models.Trade
	txErr := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&trade, "id = ?", tradeID).Error; err != nil {
			return fmt.Errorf("not_found")
		}
		if trade.ToUserID != userID {
			return fmt.Errorf("forbidden")
		}
		if trade.Status != models.TradePending {
			return fmt.Errorf("not_pending")
		}

		// Lock rows in a deterministic order (from-user first) to avoid
		// deadlocks between concurrent accepts.
		fromSpare, err := spareCopy(tx, trade.FromUserID, trade.OfferedStickerID, true)
		if err != nil {
			return fmt.Errorf("no_spare_offered")
		}
		toSpare, err := spareCopy(tx, trade.ToUserID, trade.RequestedStickerID, true)
		if err != nil {
			return fmt.Errorf("no_spare_requested")
		}

		if err := transfer(tx, fromSpare, trade.ToUserID); err != nil {
			return err
		}
		if err := transfer(tx, toSpare, trade.FromUserID); err != nil {
			return err
		}
		return tx.Model(&trade).Update("status", models.TradeAccepted).Error
	})

	if txErr != nil {
		status, msg := http.StatusInternalServerError, "swap failed"
		switch txErr.Error() {
		case "not_found":
			status, msg = http.StatusNotFound, "trade not found"
		case "forbidden":
			status, msg = http.StatusForbidden, "not your incoming trade"
		case "not_pending":
			status, msg = http.StatusConflict, "trade is no longer pending"
		case "no_spare_offered", "no_spare_requested":
			status, msg = http.StatusConflict, "a sticker in this trade is no longer available"
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	trade.Status = models.TradeAccepted
	c.JSON(http.StatusOK, trade)
}

// transfer moves one copy of giver's sticker to the receiver.
func transfer(tx *gorm.DB, giver *models.UserSticker, receiverID uuid.UUID) error {
	if err := tx.Model(giver).Update("quantity", giver.Quantity-1).Error; err != nil {
		return err
	}
	var recv models.UserSticker
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ? AND sticker_id = ?", receiverID, giver.StickerID).
		First(&recv).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return tx.Create(&models.UserSticker{
			UserID:    receiverID,
			StickerID: giver.StickerID,
			Quantity:  1,
		}).Error
	}
	if err != nil {
		return err
	}
	return tx.Model(&recv).Update("quantity", recv.Quantity+1).Error
}

func (h *Handler) Decline(c *gin.Context) {
	h.setStatus(c, models.TradeDeclined, func(t *models.Trade, uid uuid.UUID) bool {
		return t.ToUserID == uid
	})
}

func (h *Handler) Cancel(c *gin.Context) {
	h.setStatus(c, models.TradeCancelled, func(t *models.Trade, uid uuid.UUID) bool {
		return t.FromUserID == uid
	})
}

func (h *Handler) setStatus(c *gin.Context, status string, allowed func(*models.Trade, uuid.UUID) bool) {
	userID := middleware.UserID(c)
	tradeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid trade id"})
		return
	}
	var trade models.Trade
	if err := h.DB.First(&trade, "id = ?", tradeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "trade not found"})
		return
	}
	if !allowed(&trade, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not allowed"})
		return
	}
	if trade.Status != models.TradePending {
		c.JSON(http.StatusConflict, gin.H{"error": "trade is no longer pending"})
		return
	}
	if err := h.DB.Model(&trade).Update("status", status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}
	trade.Status = status
	c.JSON(http.StatusOK, trade)
}
