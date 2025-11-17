package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Type string

const (
	Rect   Type = "rect"
	Circle Type = "circle"
	Pencil Type = "pencil"
)

type BoardData struct {
	UUID      uuid.UUID      `gorm:"primarykey" json:"uuid"`
	BoardId   uuid.UUID      `gorm:"not null" json:"board_id"`
	Type      Type           `gorm:"default:'rect'" json:"type"`
	Data      datatypes.JSON `json:"data"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type Shape struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	X           float64   `json:"x"`
	Y           float64   `json:"y"`
	R           float64   `json:"r"`
	W           float64   `json:"w"`
	H           float64   `json:"h"`
	Stroke      string    `json:"stroke"`
	Fill        string    `json:"fill"`
	StrokeWidth float64   `json:"strokeWidth"`
	Points      []float64 `json:"points"`
}
