package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"panini-wc2026/backend/internal/album"
	"panini-wc2026/backend/internal/auth"
	"panini-wc2026/backend/internal/cache"
	"panini-wc2026/backend/internal/config"
	"panini-wc2026/backend/internal/db"
	"panini-wc2026/backend/internal/middleware"
	"panini-wc2026/backend/internal/packs"
	"panini-wc2026/backend/internal/seeder"
	"panini-wc2026/backend/internal/trades"
)

func main() {
	cfg := config.Load()

	gdb, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	rdb, err := cache.Connect(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}

	seeder.Run(gdb)

	authH := &auth.Handler{DB: gdb, JWTSecret: cfg.JWTSecret}
	albumH := &album.Handler{DB: gdb}
	packsH := &packs.Handler{DB: gdb, Redis: rdb, Unlimited: cfg.UnlimitedPacks}
	tradesH := &trades.Handler{DB: gdb, Redis: rdb}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), middleware.CORS(cfg.CORSOrigins))

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api := r.Group("/api")
	{
		api.POST("/auth/register", authH.Register)
		api.POST("/auth/login", authH.Login)
		api.POST("/auth/logout", authH.Logout)

		api.GET("/leaderboard", albumH.Leaderboard)
	}

	authed := api.Group("", middleware.RequireAuth(cfg.JWTSecret))
	{
		authed.GET("/album", albumH.GetAlbum)
		authed.GET("/album/progress", albumH.Progress)

		authed.POST("/packs/open", packsH.Open)
		authed.GET("/packs/status", packsH.Status)

		authed.POST("/stickers/:id/stick", albumH.Stick)
		authed.GET("/inventory", albumH.Inventory)

		authed.GET("/users", albumH.ListUsers)
		authed.GET("/users/:id/inventory", albumH.UserInventory)
		authed.GET("/users/:id/album", albumH.GetUserAlbum)

		authed.POST("/trades", tradesH.Create)
		authed.GET("/trades", tradesH.List)
		authed.PUT("/trades/:id/accept", tradesH.Accept)
		authed.PUT("/trades/:id/decline", tradesH.Decline)
		authed.DELETE("/trades/:id", tradesH.Cancel)
	}

	log.Printf("listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
