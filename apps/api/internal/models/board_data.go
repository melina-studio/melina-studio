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
	Text   Type = "text"
	Image  Type = "image"
	Line   Type = "line"
	Arrow  Type = "arrow"
	Ellipse Type = "ellipse"
	Polygon Type = "polygon"
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
	ID          string     `json:"id"`
	Type        string     `json:"type"`
	X           *float64   `json:"x,omitempty"`
	Y           *float64   `json:"y,omitempty"`
	R           *float64   `json:"r,omitempty"`
	W           *float64   `json:"w,omitempty"`
	H           *float64   `json:"h,omitempty"`
	Stroke      *string    `json:"stroke,omitempty"`
	Fill        *string    `json:"fill,omitempty"`
	StrokeWidth *float64   `json:"strokeWidth,omitempty"`
	Points      *[]float64 `json:"points,omitempty"`
	Text        *string    `json:"text,omitempty"`
	FontSize    *float64   `json:"fontSize,omitempty"`
	FontFamily  *string    `json:"fontFamily,omitempty"`
}
