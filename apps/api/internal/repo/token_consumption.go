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
	LLMModelOpenAI    llmModels = "gpt-5.1"
	LLMModelAnthropic llmModels = "claude-4.5-sonnet"
	LLMModelGemini    llmModels = "gemini-2.5-flash"
	LLMModelGroq      llmModels = "meta-llama/llama-4-scout-17b-16e-instruct"
)

type TokenConsumptionRepo struct {
	db *gorm.DB
}

// DailyTokenUsage represents aggregated token usage for a single day
type DailyTokenUsage struct {
	Date         string `json:"date"`
	TotalTokens  int64  `json:"total_tokens"`
	InputTokens  int64  `json:"input_tokens"`
	OutputTokens int64  `json:"output_tokens"`
	RequestCount int64  `json:"request_count"`
}

// TokenUsageByModel represents token usage grouped by model
type TokenUsageByModel struct {
	Model        string `json:"model"`
	Provider     string `json:"provider"`
	TotalTokens  int64  `json:"total_tokens"`
	InputTokens  int64  `json:"input_tokens"`
	OutputTokens int64  `json:"output_tokens"`
	RequestCount int64  `json:"request_count"`
}

type TokenConsumptionRepoInterface interface {
	Create(tc *models.TokenConsumption) error
	CreateFromUsage(userID uuid.UUID, boardID *uuid.UUID, chatID *uuid.UUID, provider string, model string, tokenUsage *llmHandlers.TokenUsage) error
	GetUserTotal(userID uuid.UUID) (int64, error)
	GetUserHistory(userID uuid.UUID, days int, page int, pageSize int) ([]models.TokenConsumption, int64, error)
	GetDailyUsage(userID uuid.UUID, days int) ([]DailyTokenUsage, error)
	GetUsageByModel(userID uuid.UUID, days int) ([]TokenUsageByModel, error)
	GetAnalyticsSummary(userID uuid.UUID, days int) (totalTokens int64, totalRequests int64, err error)
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

// GetUserHistory returns paginated token consumption history for a user
func (r *TokenConsumptionRepo) GetUserHistory(userID uuid.UUID, days int, page int, pageSize int) ([]models.TokenConsumption, int64, error) {
	var records []models.TokenConsumption
	var total int64

	// Calculate the start date
	startDate := time.Now().AddDate(0, 0, -days)

	// Base query
	query := r.db.Model(&models.TokenConsumption{}).
		Where("user_uuid = ? AND created_at >= ?", userID, startDate)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&records).Error; err != nil {
		return nil, 0, err
	}

	return records, total, nil
}

// GetDailyUsage returns daily aggregated token usage
func (r *TokenConsumptionRepo) GetDailyUsage(userID uuid.UUID, days int) ([]DailyTokenUsage, error) {
	var results []DailyTokenUsage

	startDate := time.Now().AddDate(0, 0, -days)

	err := r.db.Model(&models.TokenConsumption{}).
		Select("DATE(created_at) as date, SUM(total_tokens) as total_tokens, SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens, COUNT(*) as request_count").
		Where("user_uuid = ? AND created_at >= ?", userID, startDate).
		Group("DATE(created_at)").
		Order("DATE(created_at) ASC").
		Scan(&results).Error

	return results, err
}

// GetUsageByModel returns token usage grouped by model
func (r *TokenConsumptionRepo) GetUsageByModel(userID uuid.UUID, days int) ([]TokenUsageByModel, error) {
	var results []TokenUsageByModel

	startDate := time.Now().AddDate(0, 0, -days)

	err := r.db.Model(&models.TokenConsumption{}).
		Select("model, provider, SUM(total_tokens) as total_tokens, SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens, COUNT(*) as request_count").
		Where("user_uuid = ? AND created_at >= ?", userID, startDate).
		Group("model, provider").
		Order("total_tokens DESC").
		Scan(&results).Error

	return results, err
}

// GetAnalyticsSummary returns summary stats for analytics
func (r *TokenConsumptionRepo) GetAnalyticsSummary(userID uuid.UUID, days int) (totalTokens int64, totalRequests int64, err error) {
	startDate := time.Now().AddDate(0, 0, -days)

	type summary struct {
		TotalTokens   int64 `json:"total_tokens"`
		TotalRequests int64 `json:"total_requests"`
	}

	var result summary
	err = r.db.Model(&models.TokenConsumption{}).
		Select("COALESCE(SUM(total_tokens), 0) as total_tokens, COUNT(*) as total_requests").
		Where("user_uuid = ? AND created_at >= ?", userID, startDate).
		Scan(&result).Error

	return result.TotalTokens, result.TotalRequests, err
}
