package repo

import (
	"melina-studio-backend/internal/models"

	"time"

	"gorm.io/gorm"

	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type BoardDataRepo struct {
	db *gorm.DB
}

type BoardDataRepoInterface interface {
	CreateBoardData(boardData *models.BoardData) error
	SaveShapeData(boardId uuid.UUID, shapeData *models.Shape) error
	GetBoardData(boardId uuid.UUID) ([]models.BoardData, error)
	ClearBoardData(boardId uuid.UUID) error
}

// NewBoardDataRepository returns a new instance of BoardDataRepo
func NewBoardDataRepository(db *gorm.DB) BoardDataRepoInterface {
	return &BoardDataRepo{db: db}
}

func (r *BoardDataRepo) CreateBoardData(boardData *models.BoardData) error {
	return r.db.Create(boardData).Error
}

func (r *BoardDataRepo) SaveShapeData(boardId uuid.UUID, shapeData *models.Shape) error {
	shapeUUID, err := uuid.Parse(shapeData.ID)
	if err != nil {
		return err
	}

	dataMap := make(map[string]interface{})

	addFloat := func(key string, v *float64) {
		if v != nil {
			dataMap[key] = *v
		}
	}

	addString := func(key string, v *string) {
		if v != nil {
			dataMap[key] = *v
		}
	}

	switch shapeData.Type {
	case "rect":
		addFloat("x", shapeData.X)
		addFloat("y", shapeData.Y)
		addFloat("w", shapeData.W)
		addFloat("h", shapeData.H)
		addString("stroke", shapeData.Stroke)
		addString("fill", shapeData.Fill)
		addFloat("strokeWidth", shapeData.StrokeWidth)

	case "circle":
		addFloat("x", shapeData.X)
		addFloat("y", shapeData.Y)
		addFloat("r", shapeData.R)
		addString("stroke", shapeData.Stroke)
		addString("fill", shapeData.Fill)
		addFloat("strokeWidth", shapeData.StrokeWidth)

	case "text":
		addFloat("x", shapeData.X)
		addFloat("y", shapeData.Y)
		addString("text", shapeData.Text)
		addFloat("fontSize", shapeData.FontSize)
		addString("fontFamily", shapeData.FontFamily)
		addString("fill", shapeData.Fill)

	case "pencil":
		if shapeData.Points != nil {
			// store slice, not pointer
			dataMap["points"] = *shapeData.Points
		}
		addString("stroke", shapeData.Stroke)
		addString("fill", shapeData.Fill)
		addFloat("strokeWidth", shapeData.StrokeWidth)

	default:
		return fmt.Errorf("unsupported shape type: %s", shapeData.Type)
	}

	// Marshal to JSON bytes and wrap into datatypes.JSON
	bytes, err := json.Marshal(dataMap)
	if err != nil {
		return err
	}
	jsonData := datatypes.JSON(bytes)

	boardData := &models.BoardData{
		UUID:      shapeUUID,
		BoardId:   boardId,
		Type:      models.Type(shapeData.Type),
		Data:      jsonData,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Check if shape exists, update or create
	var existing models.BoardData
	result := r.db.Where("uuid = ?", shapeUUID).First(&existing)

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// Create new
		return r.db.Create(boardData).Error
	} else if result.Error != nil {
		return result.Error
	}

	// preserve original CreatedAt
	boardData.CreatedAt = existing.CreatedAt

	// Update existing
	return r.db.Model(&existing).Updates(boardData).Error
}

func (r *BoardDataRepo) GetBoardData(boardId uuid.UUID) ([]models.BoardData, error) {
	var boardData []models.BoardData
	err := r.db.Where("board_id = ?", boardId).Find(&boardData).Error
	return boardData, err
}

func (r *BoardDataRepo) ClearBoardData(boardId uuid.UUID) error {
	return r.db.Where("board_id = ?", boardId).Delete(&models.BoardData{}).Error
}
