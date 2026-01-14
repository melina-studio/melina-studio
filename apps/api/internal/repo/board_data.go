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
	UpdateShapeImageUrl(shapeId string, imageUrl string) error
	GetBoardData(boardId uuid.UUID) ([]models.BoardData, error)
	ClearBoardData(boardId uuid.UUID) error
	DeleteShape(boardId uuid.UUID, shapeId uuid.UUID) error
	DeleteShapesNotInList(boardId uuid.UUID, shapeUUIDs []uuid.UUID) error
	GetNextAnnotationNumber(boardId uuid.UUID) (int, error)
	GetShapeByUUID(shapeUUID uuid.UUID) (*models.BoardData, error)
	GetShapesByUUIDs(shapeUUIDs []uuid.UUID) ([]models.BoardData, error)
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

	case "ellipse":
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

	case "line", "arrow":
		addFloat("x", shapeData.X)
		addFloat("y", shapeData.Y)
		if shapeData.Points != nil {
			// store slice, not pointer
			dataMap["points"] = *shapeData.Points
		}
		addString("stroke", shapeData.Stroke)
		addString("fill", shapeData.Fill)
		addFloat("strokeWidth", shapeData.StrokeWidth)

	case "polygon":
		addFloat("x", shapeData.X)
		addFloat("y", shapeData.Y)
		if shapeData.Points != nil {
			// store slice, not pointer
			dataMap["points"] = *shapeData.Points
		}
		addString("stroke", shapeData.Stroke)
		addString("fill", shapeData.Fill)
		addFloat("strokeWidth", shapeData.StrokeWidth)

	case "pencil":
		if shapeData.Points != nil {
			// store slice, not pointer
			dataMap["points"] = *shapeData.Points
		}
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

	case "path":
		addFloat("x", shapeData.X)
		addFloat("y", shapeData.Y)
		addString("data", shapeData.Data) // SVG path data string
		addString("stroke", shapeData.Stroke)
		addString("fill", shapeData.Fill)
		addFloat("strokeWidth", shapeData.StrokeWidth)

	default:
		// Handle unknown shape types by storing all available properties
		addFloat("x", shapeData.X)
		addFloat("y", shapeData.Y)
		addFloat("w", shapeData.W)
		addFloat("h", shapeData.H)
		addFloat("r", shapeData.R)
		addString("stroke", shapeData.Stroke)
		addString("fill", shapeData.Fill)
		addFloat("strokeWidth", shapeData.StrokeWidth)
		if shapeData.Points != nil {
			dataMap["points"] = *shapeData.Points
		}
		addString("text", shapeData.Text)
		addFloat("fontSize", shapeData.FontSize)
		addString("fontFamily", shapeData.FontFamily)
		addString("data", shapeData.Data) // SVG path data string
	}

	// Marshal to JSON bytes and wrap into datatypes.JSON
	bytes, err := json.Marshal(dataMap)
	if err != nil {
		return err
	}
	jsonData := datatypes.JSON(bytes)

	// Check if shape exists first to determine if we need a new annotation number
	var existing models.BoardData
	result := r.db.Where("uuid = ?", shapeUUID).First(&existing)

	var annotationNumber int
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// New shape - get the next annotation number
		nextNum, err := r.GetNextAnnotationNumber(boardId)
		if err != nil {
			return fmt.Errorf("failed to get next annotation number: %w", err)
		}
		annotationNumber = nextNum
	} else if result.Error != nil {
		return result.Error
	} else {
		// Existing shape - preserve its annotation number
		annotationNumber = existing.AnnotationNumber
	}

	boardData := &models.BoardData{
		UUID:             shapeUUID,
		BoardId:          boardId,
		Type:             models.Type(shapeData.Type),
		Data:             jsonData,
		AnnotationNumber: annotationNumber,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// Create new
		return r.db.Create(boardData).Error
	}

	// preserve original CreatedAt
	boardData.CreatedAt = existing.CreatedAt

	// Update existing
	return r.db.Model(&existing).Updates(boardData).Error
}

func (r *BoardDataRepo) UpdateShapeImageUrl(shapeId string, imageUrl string) error {
	shapeUUID, err := uuid.Parse(shapeId)
	if err != nil {
		return err
	}

	result := r.db.Model(&models.BoardData{}).
		Where("uuid = ?", shapeUUID).
		Updates(map[string]any{
			"image_url":  imageUrl,
			"updated_at": time.Now(),
		})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("shape not found")
	}
	return nil
}

func (r *BoardDataRepo) GetBoardData(boardId uuid.UUID) ([]models.BoardData, error) {
	var boardData []models.BoardData
	err := r.db.Where("board_id = ?", boardId).Find(&boardData).Error
	return boardData, err
}

func (r *BoardDataRepo) ClearBoardData(boardId uuid.UUID) error {
	return r.db.Where("board_id = ?", boardId).Delete(&models.BoardData{}).Error
}

// DeleteShape deletes a single shape by its UUID
func (r *BoardDataRepo) DeleteShape(boardId uuid.UUID, shapeId uuid.UUID) error {
	result := r.db.Where("board_id = ? AND uuid = ?", boardId, shapeId).Delete(&models.BoardData{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("shape not found")
	}
	return nil
}

func (r *BoardDataRepo) DeleteShapesNotInList(boardId uuid.UUID, shapeUUIDs []uuid.UUID) error {
	if len(shapeUUIDs) == 0 {
		// If no shapes in the list, delete all shapes for this board
		return r.db.Where("board_id = ?", boardId).Delete(&models.BoardData{}).Error
	}
	// Delete shapes that belong to this board but are not in the provided list
	return r.db.Where("board_id = ? AND uuid NOT IN ?", boardId, shapeUUIDs).Delete(&models.BoardData{}).Error
}

// GetNextAnnotationNumber returns the next available annotation number for a board
func (r *BoardDataRepo) GetNextAnnotationNumber(boardId uuid.UUID) (int, error) {
	var maxNumber int
	err := r.db.Model(&models.BoardData{}).
		Where("board_id = ?", boardId).
		Select("COALESCE(MAX(annotation_number), 0)").
		Scan(&maxNumber).Error
	if err != nil {
		return 0, err
	}
	return maxNumber + 1, nil
}

// GetShapeByUUID returns a shape by its UUID
func (r *BoardDataRepo) GetShapeByUUID(shapeUUID uuid.UUID) (*models.BoardData, error) {
	var shape models.BoardData
	err := r.db.Where("uuid = ?", shapeUUID).First(&shape).Error
	if err != nil {
		return nil, err
	}
	return &shape, nil
}

// GetShapesByUUIDs returns multiple shapes by their UUIDs in a single query
func (r *BoardDataRepo) GetShapesByUUIDs(shapeUUIDs []uuid.UUID) ([]models.BoardData, error) {
	if len(shapeUUIDs) == 0 {
		return []models.BoardData{}, nil
	}
	var shapes []models.BoardData
	err := r.db.Where("uuid IN ?", shapeUUIDs).Find(&shapes).Error
	return shapes, err
}
