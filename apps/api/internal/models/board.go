package models

import (
	"time"

	"github.com/google/uuid"
)

// Board represents the database model
type Board struct {
	UUID               uuid.UUID `gorm:"column:uuid;primarykey" json:"uuid"`
	Title              string    `gorm:"not null" json:"title"`
	UserID             uuid.UUID `gorm:"not null" json:"user_id"`
	Starred            bool      `gorm:"default:false" json:"starred"`
	IsDeleted          bool      `gorm:"default:false" json:"is_deleted"`
	Thumbnail          string    `json:"thumbnail"`
	AnnotatedImageHash string    `gorm:"default:''" json:"annotated_image_hash"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}
