package models

import (
	"time"

	"github.com/google/uuid"
)

type CustomRules struct {
	UUID      uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"uuid"`
	UserID    uuid.UUID `gorm:"not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Rules     string    `gorm:"not null" json:"rules"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
