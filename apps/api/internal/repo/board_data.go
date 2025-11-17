package repo

import (
	"melina-studio-backend/internal/models"

	"time"

	"gorm.io/gorm"

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

	var jsonData datatypes.JSON
	var dataMap map[string]interface{}

	if shapeData.Type == "rect" {
		dataMap = map[string]interface{}{
			"x":           shapeData.X,
			"y":           shapeData.Y,
			"w":           shapeData.W,
			"h":           shapeData.H,
			"stroke":      shapeData.Stroke,
			"fill":        shapeData.Fill,
			"strokeWidth": shapeData.StrokeWidth,
		}
	} else if shapeData.Type == "circle" {
		dataMap = map[string]interface{}{
			"x":           shapeData.X,
			"y":           shapeData.Y,
			"r":           shapeData.R,
			"stroke":      shapeData.Stroke,
			"fill":        shapeData.Fill,
			"strokeWidth": shapeData.StrokeWidth,
		}
	} else if shapeData.Type == "pencil" {
		dataMap = map[string]interface{}{
			"points": shapeData.Points,
		}
	}

	jsonData, err = datatypes.NewJSONType(dataMap).MarshalJSON()
	if err != nil {
		return err
	}

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

	if result.Error == gorm.ErrRecordNotFound {
		// Create new
		return r.db.Create(boardData).Error
	} else if result.Error != nil {
		return result.Error
	}

	// Update existing
	return r.db.Model(&existing).Updates(boardData).Error
}

func (r *BoardDataRepo) GetBoardData(boardId uuid.UUID) ([]models.BoardData, error) {
	var boardData []models.BoardData
	err := r.db.Where("board_id = ?", boardId).Find(&boardData).Error
	return boardData, err
}
