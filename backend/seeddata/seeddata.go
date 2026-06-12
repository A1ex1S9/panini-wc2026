// Package seeddata embeds the sticker dataset produced by scraper/scrape.py.
package seeddata

import _ "embed"

//go:embed stickers.json
var StickersJSON []byte
