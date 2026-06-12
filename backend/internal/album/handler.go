package album

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"panini-wc2026/backend/internal/middleware"
	"panini-wc2026/backend/internal/models"
)

type Handler struct {
	DB *gorm.DB
}

type albumSticker struct {
	models.Sticker
	Quantity     int  `json:"quantity"`
	StuckInAlbum bool `json:"stuck_in_album"`
}

func (h *Handler) ownedMap(userID uuid.UUID) (map[uuid.UUID]models.UserSticker, error) {
	var owned []models.UserSticker
	if err := h.DB.Where("user_id = ?", userID).Find(&owned).Error; err != nil {
		return nil, err
	}
	m := make(map[uuid.UUID]models.UserSticker, len(owned))
	for _, us := range owned {
		m[us.StickerID] = us
	}
	return m, nil
}

func (h *Handler) albumFor(userID uuid.UUID) ([]albumSticker, error) {
	var stickers []models.Sticker
	if err := h.DB.Order("sticker_number").Find(&stickers).Error; err != nil {
		return nil, err
	}
	owned, err := h.ownedMap(userID)
	if err != nil {
		return nil, err
	}
	out := make([]albumSticker, 0, len(stickers))
	for _, st := range stickers {
		as := albumSticker{Sticker: st}
		if us, ok := owned[st.ID]; ok {
			as.Quantity = us.Quantity
			as.StuckInAlbum = us.StuckInAlbum
		}
		out = append(out, as)
	}
	return out, nil
}

// GetAlbum returns every sticker in the collection with the caller's
// ownership state merged in.
func (h *Handler) GetAlbum(c *gin.Context) {
	album, err := h.albumFor(middleware.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load album"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"stickers": album})
}

// GetUserAlbum is the read-only view of another user's album.
func (h *Handler) GetUserAlbum(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	var user models.User
	if err := h.DB.First(&user, "id = ?", targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	album, err := h.albumFor(targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load album"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user, "stickers": album})
}

type teamProgress struct {
	Team  string `json:"team"`
	Total int64  `json:"total"`
	Stuck int64  `json:"stuck"`
}

func (h *Handler) Progress(c *gin.Context) {
	userID := middleware.UserID(c)

	var total int64
	if err := h.DB.Model(&models.Sticker{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "count failure"})
		return
	}
	var stuck int64
	h.DB.Model(&models.UserSticker{}).
		Where("user_id = ? AND stuck_in_album", userID).Count(&stuck)

	var perTeam []teamProgress
	h.DB.Raw(`
		SELECT s.team,
		       COUNT(*) AS total,
		       COUNT(us.id) FILTER (WHERE us.stuck_in_album) AS stuck
		FROM stickers s
		LEFT JOIN user_stickers us ON us.sticker_id = s.id AND us.user_id = ?
		GROUP BY s.team
		ORDER BY s.team`, userID).Scan(&perTeam)

	percent := 0.0
	if total > 0 {
		percent = float64(stuck) / float64(total) * 100
	}
	c.JSON(http.StatusOK, gin.H{
		"total":    total,
		"stuck":    stuck,
		"percent":  percent,
		"per_team": perTeam,
	})
}

// Stick places an owned sticker into the album.
func (h *Handler) Stick(c *gin.Context) {
	userID := middleware.UserID(c)
	stickerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sticker id"})
		return
	}
	var us models.UserSticker
	if err := h.DB.Where("user_id = ? AND sticker_id = ?", userID, stickerID).
		First(&us).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "you do not own this sticker"})
		return
	}
	if us.StuckInAlbum {
		c.JSON(http.StatusConflict, gin.H{"error": "already stuck in album"})
		return
	}
	if us.Quantity < 1 {
		c.JSON(http.StatusConflict, gin.H{"error": "no copies available"})
		return
	}
	if err := h.DB.Model(&us).Update("stuck_in_album", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not stick"})
		return
	}
	us.StuckInAlbum = true
	c.JSON(http.StatusOK, us)
}

// Inventory lists the caller's spare stickers (owned but not yet stuck, or
// extra copies beyond the stuck one).
func (h *Handler) Inventory(c *gin.Context) {
	h.inventoryFor(c, middleware.UserID(c))
}

// UserInventory lists another user's tradeable duplicates.
func (h *Handler) UserInventory(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	h.inventoryFor(c, targetID)
}

type inventoryItem struct {
	models.UserSticker
	SpareQuantity int `json:"spare_quantity"`
}

func (h *Handler) inventoryFor(c *gin.Context, userID uuid.UUID) {
	var items []models.UserSticker
	err := h.DB.Preload("Sticker").
		Where("user_id = ? AND (quantity > 1 OR (quantity = 1 AND NOT stuck_in_album))", userID).
		Find(&items).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load inventory"})
		return
	}
	out := make([]inventoryItem, 0, len(items))
	for _, it := range items {
		spare := it.Quantity
		if it.StuckInAlbum {
			spare--
		}
		out = append(out, inventoryItem{UserSticker: it, SpareQuantity: spare})
	}
	c.JSON(http.StatusOK, gin.H{"items": out})
}

// ListUsers returns all users with their album completion, for the trading
// browser and leaderboard.
func (h *Handler) ListUsers(c *gin.Context) {
	users, err := h.usersWithCompletion(0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load users"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

func (h *Handler) Leaderboard(c *gin.Context) {
	users, err := h.usersWithCompletion(20)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load leaderboard"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

type userRow struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Stuck    int64     `json:"stuck"`
	Total    int64     `json:"total"`
	Percent  float64   `json:"percent"`
}

func (h *Handler) usersWithCompletion(limit int) ([]userRow, error) {
	q := `
		SELECT u.id, u.username,
		       COUNT(us.id) FILTER (WHERE us.stuck_in_album) AS stuck,
		       (SELECT COUNT(*) FROM stickers) AS total
		FROM users u
		LEFT JOIN user_stickers us ON us.user_id = u.id
		GROUP BY u.id, u.username
		ORDER BY stuck DESC, u.username`
	if limit > 0 {
		q += " LIMIT 20"
	}
	var rows []userRow
	if err := h.DB.Raw(q).Scan(&rows).Error; err != nil {
		return nil, err
	}
	for i := range rows {
		if rows[i].Total > 0 {
			rows[i].Percent = float64(rows[i].Stuck) / float64(rows[i].Total) * 100
		}
	}
	return rows, nil
}
