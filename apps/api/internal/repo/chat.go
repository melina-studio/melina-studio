package repo

import (
	llmHandlers "melina-studio-backend/internal/llm_handlers"
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
	GetChatsByBoardId(boardId uuid.UUID , page int, pageSize int, fields ...string) ([]models.Chat, int64, error)
	CreateHumanAndAiMessages(boardUUID uuid.UUID, humanMessage string, aiMessage string) (uuid.UUID, uuid.UUID, error)
	GetChatHistory(boardId uuid.UUID, size int) ([]llmHandlers.Message, error)
	GetLatestChats(boardId uuid.UUID, limit int, fields ...string) ([]models.Chat, error)
}

func NewChatRepository(db *gorm.DB) ChatRepoInterface {
	return &ChatRepo{db: db}
}

func (r *ChatRepo) CreateChat(chat *models.Chat) error {
	return r.db.Create(chat).Error
}

// signature returns chats, totalCount, error
func (r *ChatRepo) GetChatsByBoardId(boardId uuid.UUID, page int, pageSize int, fields ...string) ([]models.Chat, int64, error) {
	var chats []models.Chat
	var total int64

	// sane defaults + cap
	if page < 1 {
		page = 1
	}
	const DefaultPageSize = 20
	const MaxPageSize = 100
	if pageSize <= 0 {
		pageSize = DefaultPageSize
	}
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}

	offset := (page - 1) * pageSize

	base := r.db.Model(&models.Chat{}).Where("board_uuid = ?", boardId)

	// total count
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// apply select if fields passed
	query := base
	if len(fields) > 0 {
		query = query.Select(fields)
	}

	// optional: choose ordering (newest first)
	if err := query.Order("created_at desc").
		Limit(pageSize).
		Offset(offset).
		Find(&chats).Error; err != nil {
		return nil, 0, err
	}

	return chats, total, nil
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


func (r *ChatRepo) GetLatestChats(boardId uuid.UUID, limit int, fields ...string) ([]models.Chat, error) {
	var chats []models.Chat

	// default + cap
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	query := r.db.Model(&models.Chat{}).Where("board_uuid = ?", boardId)

	if len(fields) > 0 {
		query = query.Select(fields)
	}

	err := query.Order("created_at ASC").Limit(limit).Find(&chats).Error
	return chats, err
}


func (r *ChatRepo) GetChatHistory(boardId uuid.UUID, size int) ([]llmHandlers.Message, error) {

	chats, err := r.GetLatestChats(boardId , size, "role", "content" )
		if err != nil {
			return nil, err
		}

	chatHistoryMessages := []llmHandlers.Message{}
	for _, chat := range chats {
		chatHistoryMessages = append(chatHistoryMessages, llmHandlers.Message{
			Role:    chat.Role,
			Content: chat.Content,
		})
	}

	return chatHistoryMessages, nil
}