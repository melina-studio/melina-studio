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
	GetAllBoards(userID uuid.UUID) ([]models.Board, error)
	GetBoardById(userID uuid.UUID, boardId uuid.UUID) (models.Board, error)
	UpdateBoard(userID uuid.UUID, boardId uuid.UUID, board *models.Board) error
	DeleteBoardByID(userID uuid.UUID, boardId uuid.UUID) error
}

func NewBoardRepository(db *gorm.DB) BoardRepoInterface {
	return &BoardRepo{db: db}
}

// CreateBoard creates a new board in the database
func (r *BoardRepo) CreateBoard(board *models.Board) (uuid.UUID, error) {
	uuid := uuid.New()
	board.UUID = uuid
	board.CreatedAt = time.Now()
	board.UpdatedAt = time.Now()
	err := r.db.Create(board).Error
	return uuid, err
}

// GetBoardById returns a board by its ID
func (r *BoardRepo) GetBoardById(userID uuid.UUID, boardId uuid.UUID) (models.Board, error) {
	var board models.Board
	err := r.db.Where(&models.Board{UUID: boardId, UserID: userID}).First(&board).Error
	return board, err
}

// UpdateBoard updates a board in the database
func (r *BoardRepo) UpdateBoard(userID uuid.UUID, boardId uuid.UUID, board *models.Board) error {
	return r.db.Model(&models.Board{UUID: boardId, UserID: userID}).Updates(board).Error
}

// DeleteBoardByID deletes a board in the database
func (r *BoardRepo) DeleteBoardByID(userID uuid.UUID, boardId uuid.UUID) error {
	return r.db.Delete(&models.Board{UUID: boardId, UserID: userID}).Error
}

// GetAllBoards returns all boards in the database
func (r *BoardRepo) GetAllBoards(userID uuid.UUID) ([]models.Board, error) {
	var boards []models.Board
	err := r.db.Where(&models.Board{UserID: userID}).Find(&boards).Error
	return boards, err
}
