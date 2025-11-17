package repo

import (
	"melina-studio-backend/internal/models"
	"time"

	"gorm.io/gorm"

	"github.com/google/uuid"
)

// BoardRepo represents the repository for the board model
type BoardRepo struct {
	db *gorm.DB
}

type BoardRepoInterface interface {
	CreateBoard(board *models.Board) (uuid.UUID, error)
	GetAllBoards() ([]models.Board, error)
}

func NewBoardRepository(db *gorm.DB) BoardRepoInterface {
	return &BoardRepo{db: db}
}

// CreateBoard creates a new board in the database
func (r *BoardRepo) CreateBoard(board *models.Board) (uuid.UUID, error) {
	uuid := uuid.New()
	board.UUUID = uuid
	board.CreatedAt = time.Now()
	board.UpdatedAt = time.Now()
	err := r.db.Create(board).Error
	return uuid, err
}

// GetAllBoards returns all boards in the database
func (r *BoardRepo) GetAllBoards() ([]models.Board, error) {
	var boards []models.Board
	err := r.db.Find(&boards).Error
	return boards, err
}
