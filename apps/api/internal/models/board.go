package models

import (
	"time"

	"github.com/google/uuid"
)

// Board represents the database model
type Board struct {
	UUUID     uuid.UUID `gorm:"primarykey" json:"uuid"`
	Title     string    `gorm:"not null" json:"title"`
	UserID    uuid.UUID `gorm:"not null" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Thumbnail string    `json:"thumbnail"`
}
