// Seed populates the stickers table from the embedded dataset scraped from
// Wikipedia (scraper/scrape.py → backend/seeddata/stickers.json).
//
// Usage: go run ./cmd/seed   (DATABASE_URL env, same as the server)
package main

import (
	"encoding/json"
	"log"
	"os"
	"time"

	"gorm.io/gorm/clause"

	"panini-wc2026/backend/internal/config"
	"panini-wc2026/backend/internal/db"
	"panini-wc2026/backend/internal/models"
	"panini-wc2026/backend/seeddata"
)

type seedSticker struct {
	StickerNumber  int     `json:"sticker_number"`
	PlayerName     string  `json:"player_name"`
	PlayerLastname string  `json:"player_lastname"`
	Position       string  `json:"position"`
	Team           string  `json:"team"`
	TeamColor      string  `json:"team_color"`
	GroupName      string  `json:"group_name"`
	TeamCode       string  `json:"team_code"`
	DOB            *string `json:"dob"`
	HeightCM       *int    `json:"height_cm"`
	WeightKG       *int    `json:"weight_kg"`
	Club           string  `json:"club"`
	ClubLogoURL    string  `json:"club_logo_url"`
	PhotoURL       string  `json:"photo_url"`
	Rarity         string  `json:"rarity"`
	IsSpecial      bool    `json:"is_special"`
}

func main() {
	cfg := config.Load()
	gdb, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	var seeds []seedSticker
	if err := json.Unmarshal(seeddata.StickersJSON, &seeds); err != nil {
		log.Fatalf("parse seed data: %v", err)
	}
	if len(seeds) == 0 {
		log.Fatal("seed data is empty — run scraper/scrape.py first")
	}

	rows := make([]models.Sticker, 0, len(seeds))
	for _, s := range seeds {
		row := models.Sticker{
			StickerNumber:  s.StickerNumber,
			PlayerName:     s.PlayerName,
			PlayerLastname: s.PlayerLastname,
			Position:       s.Position,
			Team:           s.Team,
			TeamColor:      s.TeamColor,
			GroupName:      s.GroupName,
			TeamCode:       s.TeamCode,
			HeightCM:       s.HeightCM,
			WeightKG:       s.WeightKG,
			Club:           s.Club,
			ClubLogoURL:    s.ClubLogoURL,
			PhotoURL:       s.PhotoURL,
			Rarity:         s.Rarity,
			IsSpecial:      s.IsSpecial,
		}
		if s.DOB != nil && *s.DOB != "" {
			if t, err := time.Parse("2006-01-02", *s.DOB); err == nil {
				row.DOB = &t
			}
		}
		rows = append(rows, row)
	}

	// Upsert on sticker_number so re-seeding refreshes data without breaking
	// existing user_stickers references.
	err = gdb.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "sticker_number"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"player_name", "player_lastname", "position", "team", "team_color",
			"group_name", "team_code", "dob", "height_cm", "weight_kg", "club",
			"club_logo_url", "photo_url", "rarity", "is_special",
		}),
	}).CreateInBatches(rows, 200).Error
	if err != nil {
		log.Fatalf("seed insert: %v", err)
	}

	var count int64
	gdb.Model(&models.Sticker{}).Count(&count)
	log.Printf("seeded %d stickers (table now has %d)", len(rows), count)
	os.Exit(0)
}
