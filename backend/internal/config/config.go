package config

import (
	"os"
	"strings"
)

type Config struct {
	DatabaseURL string
	RedisURL    string
	JWTSecret   string
	Port        string
	CORSOrigins []string
}

func Load() Config {
	return Config{
		DatabaseURL: getenv("DATABASE_URL", "postgres://panini:secret@localhost:5432/panini?sslmode=disable"),
		RedisURL:    getenv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getenv("JWT_SECRET", "changeme"),
		Port:        getenv("PORT", "8080"),
		CORSOrigins: strings.Split(getenv("CORS_ORIGINS", "http://localhost:5173"), ","),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
