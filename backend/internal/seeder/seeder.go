package seeder

import (
	"encoding/json"
	"log"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

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
	PhotoURL       string  `json:"photo_url"`
	Rarity         string  `json:"rarity"`
	IsSpecial      bool    `json:"is_special"`
}

// Run upserts all stickers from the embedded JSON. Safe to call on every startup.
func Run(gdb *gorm.DB) {
	var count int64
	gdb.Model(&models.Sticker{}).Count(&count)
	if count > 0 {
		log.Printf("seeder: %d stickers already present, skipping", count)
		return
	}

	var seeds []seedSticker
	if err := json.Unmarshal(seeddata.StickersJSON, &seeds); err != nil {
		log.Printf("seeder: parse error: %v", err)
		return
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

	err := gdb.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "sticker_number"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"player_name", "player_lastname", "position", "team", "team_color",
			"group_name", "team_code", "dob", "height_cm", "weight_kg", "club",
			"photo_url", "rarity", "is_special",
		}),
	}).CreateInBatches(rows, 200).Error
	if err != nil {
		log.Printf("seeder: insert error: %v", err)
		return
	}
	log.Printf("seeder: inserted %d stickers", len(rows))
}
