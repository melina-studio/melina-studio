package repo

import (
	"melina-studio-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChatRepo struct {
	db *gorm.DB
}

type ChatRepoInterface interface {
	CreateChat(chat *models.Chat) error
	GetChatsByBoardId(boardId uuid.UUID) ([]models.Chat, error)
	CreateHumanAndAiMessages(boardUUID uuid.UUID, humanMessage string, aiMessage string) (uuid.UUID, uuid.UUID, error)
}

func NewChatRepository(db *gorm.DB) ChatRepoInterface {
	return &ChatRepo{db: db}
}

func (r *ChatRepo) CreateChat(chat *models.Chat) error {
	return r.db.Create(chat).Error
}

func (r *ChatRepo) GetChatsByBoardId(boardId uuid.UUID) ([]models.Chat, error) {
	var chats []models.Chat
	err := r.db.Where("board_uuid = ?", boardId).Find(&chats).Error
	return chats, err
}

func (r *ChatRepo) CreateHumanAndAiMessages(boardUUID uuid.UUID, humanMessage string, aiMessage string) (uuid.UUID, uuid.UUID, error) {
	humanMessageUUID := uuid.New()
	aiMessageUUID := uuid.New()
	
	// Use a transaction to ensure both messages are created atomically
	err := r.db.Transaction(func(tx *gorm.DB) error {
		// Create human message
		if err := tx.Create(&models.Chat{
			UUID:      humanMessageUUID,
			BoardUUID: boardUUID,
			Content:   humanMessage,
			Role:      models.RoleUser,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}).Error; err != nil {
			return err
		}
		
		// Create AI message
		if err := tx.Create(&models.Chat{
			UUID:      aiMessageUUID,
			BoardUUID: boardUUID,
			Content:   aiMessage,
			Role:      models.RoleAssistant,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}).Error; err != nil {
			return err
		}
		
		return nil
	})
	
	return humanMessageUUID, aiMessageUUID, err
}