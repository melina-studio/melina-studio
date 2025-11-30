package models

import (
	"time"

	"github.com/google/uuid"
)

type Role string

const (
	RoleUser Role = "user"
	RoleAssistant Role = "assistant"
)

type Chat struct {
	UUID      uuid.UUID `gorm:"type:uuid;primaryKey;" json:"uuid"`
	BoardUUID   uuid.UUID `gorm:"not null" json:"board_uuid"`
	Content   string    `gorm:"not null" json:"content"`
	Role      Role      `gorm:"not null" json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
