package config

import (
	"os"
	"strconv"
	"time"
)

// CleanupConfig holds configuration for the cleanup service
type CleanupConfig struct {
	Enabled  bool
	Interval time.Duration
	MaxAge   time.Duration
}

// LoadCleanupConfig loads cleanup configuration from environment variables
func LoadCleanupConfig() CleanupConfig {
	enabled := true
	if val := os.Getenv("CLEANUP_ENABLED"); val != "" {
		enabled, _ = strconv.ParseBool(val)
	}

	intervalMinutes := 60
	if val := os.Getenv("CLEANUP_INTERVAL_MINUTES"); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
			intervalMinutes = parsed
		}
	}

	maxAgeMinutes := 60
	if val := os.Getenv("CLEANUP_MAX_AGE_MINUTES"); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
			maxAgeMinutes = parsed
		}
	}

	return CleanupConfig{
		Enabled:  enabled,
		Interval: time.Duration(intervalMinutes) * time.Minute,
		MaxAge:   time.Duration(maxAgeMinutes) * time.Minute,
	}
}
