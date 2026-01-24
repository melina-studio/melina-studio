package repo

import (
	"fmt"
	"time"

	llmHandlers "melina-studio-backend/internal/llm_handlers"
	"melina-studio-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type llmModels string
const (
    LLMModelOpenAI llmModels = "gpt-5.1"
    LLMModelAnthropic llmModels = "claude-4.5-sonnet"
    LLMModelGemini llmModels = "gemini-2.5-flash"
    LLMModelGroq llmModels = "meta-llama/llama-4-scout-17b-16e-instruct"
)

type TokenConsumptionRepo struct {
    db *gorm.DB
}

type TokenConsumptionRepoInterface interface {
    Create(tc *models.TokenConsumption) error
    CreateFromUsage(userID uuid.UUID, boardID *uuid.UUID, chatID *uuid.UUID, provider string, model string, tokenUsage *llmHandlers.TokenUsage) error
    GetUserTotal(userID uuid.UUID) (int64, error)
}

func NewTokenConsumptionRepository(db *gorm.DB) TokenConsumptionRepoInterface {
    return &TokenConsumptionRepo{db: db}
}


func (r *TokenConsumptionRepo) Create(tc *models.TokenConsumption) error {
    // Auto-generate UUID if not provided
    if tc.UUID == uuid.Nil {
        tc.UUID = uuid.New()
    }
    
    // Auto-set timestamps if not provided
    if tc.CreatedAt.IsZero() {
        tc.CreatedAt = time.Now()
    }
    if tc.UpdatedAt.IsZero() {
        tc.UpdatedAt = time.Now()
    }
    
    return r.db.Create(tc).Error
}

// CreateFromUsage creates a new token consumption record from usage data
func (r *TokenConsumptionRepo) CreateFromUsage(userID uuid.UUID, boardID *uuid.UUID, chatID *uuid.UUID, provider string, model string, tokenUsage *llmHandlers.TokenUsage) error {
    switch provider {
    case "openai":
        model = string(LLMModelOpenAI)
    case "anthropic":
        model = string(LLMModelAnthropic)
    case "gemini":
        model = string(LLMModelGemini)
    case "groq":
        model = string(LLMModelGroq)
    }

    if model == "" {
        return fmt.Errorf("invalid model: %s", model)
    }
    
    tc := &models.TokenConsumption{
        UUID:           uuid.New(),
        UserUUID:       userID,
        BoardUUID:      boardID,
        ChatUUID:       chatID,
        Provider:       provider,
        Model:          model,
        TotalTokens:    tokenUsage.TotalTokens,
        InputTokens:    tokenUsage.InputTokens,
        OutputTokens:   tokenUsage.OutputTokens,
        CountingMethod: tokenUsage.CountingMethod,
        CreatedAt:      time.Now(),
        UpdatedAt:      time.Now(),
    }
    return r.db.Create(tc).Error
}

func (r *TokenConsumptionRepo) GetUserTotal(userID uuid.UUID) (int64, error) {
    var total int64
    err := r.db.Model(&models.TokenConsumption{}).
        Where("user_uuid = ?", userID).
        Select("COALESCE(SUM(total_tokens), 0)").
        Scan(&total).Error
    return total, err
}