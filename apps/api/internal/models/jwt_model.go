package models

import (
	"time"

	"github.com/google/uuid"
)

type RefreshToken struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	TokenID    string     `gorm:"not null;uniqueIndex" json:"-"` // JWT ID (jti) for tracking
	ExpiresAt  time.Time  `gorm:"not null" json:"expires_at"`
	Revoked    bool       `gorm:"default:false" json:"revoked"`
	CreatedAt  time.Time  `gorm:"default:now()" json:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	UserAgent  string     `json:"user_agent,omitempty"`
	IPAddress  string     `json:"ip_address,omitempty"`
}
