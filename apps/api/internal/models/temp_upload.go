package models

import (
	"time"

	"github.com/google/uuid"
)

// TempUpload tracks temporary image uploads for cleanup
type TempUpload struct {
	UUID      uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"uuid"`
	BoardID   uuid.UUID `gorm:"type:uuid;not null;index" json:"board_id"`
	ObjectKey string    `gorm:"type:varchar(500);not null" json:"object_key"` // GCS object key
	URL       string    `gorm:"type:varchar(500);not null" json:"url"`        // Full public URL
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}
