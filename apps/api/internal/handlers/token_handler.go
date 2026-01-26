package handlers

import (
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/repo"
	"melina-studio-backend/internal/service"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type TokenHandler struct {
	tokenRepo            repo.TokenConsumptionRepoInterface
	subscriptionPlanRepo repo.SubscriptionPlanRepoInterface
}

func NewTokenHandler(tokenRepo repo.TokenConsumptionRepoInterface, subscriptionPlanRepo repo.SubscriptionPlanRepoInterface) *TokenHandler {
	return &TokenHandler{
		tokenRepo:            tokenRepo,
		subscriptionPlanRepo: subscriptionPlanRepo,
	}
}

func (h *TokenHandler) GetTokenConsumption(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Locals("userID").(string))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	totalTokens, err := h.tokenRepo.GetUserTotal(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get token consumption",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"total_tokens": totalTokens,
	})
}

// GetSubscriptionStatus returns the user's current subscription status and token usage
func (h *TokenHandler) GetSubscriptionStatus(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Locals("userID").(string))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get token usage stats
	consumed, limit, percentage, err := service.GetUserTokenUsage(config.DB, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get token usage",
		})
	}

	// Get user details for subscription info
	authRepo := repo.NewAuthRepository(config.DB)
	user, err := authRepo.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get user details",
		})
	}

	// Calculate reset date
	var resetDate string
	if user.LastTokenResetDate != nil {
		nextReset := user.LastTokenResetDate.AddDate(0, 1, 0)
		resetDate = nextReset.Format(time.RFC3339)
	} else {
		resetDate = time.Now().AddDate(0, 1, 0).Format(time.RFC3339)
	}

	// Calculate warning threshold (80% of limit)
	warningThreshold := int(float64(limit) * 0.8)

	// Determine if user is blocked
	isBlocked := percentage >= 100.0

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"subscription":      user.Subscription,
		"consumed_tokens":   consumed,
		"total_limit":       limit,
		"percentage":        percentage,
		"reset_date":        resetDate,
		"warning_threshold": warningThreshold,
		"is_blocked":        isBlocked,
	})
}

// GetAllSubscriptionPlans returns all available subscription plans
func (h *TokenHandler) GetAllSubscriptionPlans(c *fiber.Ctx) error {
	plans, err := h.subscriptionPlanRepo.GetAllPlans()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get subscription plans",
		})
	}

	return c.Status(fiber.StatusOK).JSON(plans)
}

// Model pricing per 1M tokens (in USD)
var modelPricing = map[string]struct {
	Input  float64
	Output float64
}{
	"claude-4.5-sonnet": {Input: 3.00, Output: 15.00},
	"gpt-5.1":           {Input: 2.50, Output: 10.00},
	"gemini-2.5-flash":  {Input: 0.075, Output: 0.30},
	"meta-llama/llama-4-scout-17b-16e-instruct": {Input: 0.11, Output: 0.34},
	"llama-3.3-70b-versatile":                   {Input: 0.59, Output: 0.79},
}

// calculateCost calculates the cost for token usage based on model pricing
func calculateCost(model string, inputTokens, outputTokens int) float64 {
	pricing, exists := modelPricing[model]
	if !exists {
		// Default pricing if model not found
		pricing = struct {
			Input  float64
			Output float64
		}{Input: 1.0, Output: 2.0}
	}

	// Cost per token = price per 1M tokens / 1,000,000
	inputCost := (float64(inputTokens) / 1_000_000) * pricing.Input
	outputCost := (float64(outputTokens) / 1_000_000) * pricing.Output

	return inputCost + outputCost
}

// GetTokenAnalytics returns detailed token consumption analytics
func (h *TokenHandler) GetTokenAnalytics(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Locals("userID").(string))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse query params
	days := c.QueryInt("days", 30)
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("pageSize", 20)

	// Cap days to reasonable limits
	if days < 1 {
		days = 1
	}
	if days > 90 {
		days = 90
	}

	// Get daily usage
	dailyUsage, err := h.tokenRepo.GetDailyUsage(userID, days)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get daily usage",
		})
	}

	// Get usage by model
	usageByModel, err := h.tokenRepo.GetUsageByModel(userID, days)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get usage by model",
		})
	}

	// Calculate total cost by model
	type ModelUsageWithCost struct {
		Model        string  `json:"model"`
		Provider     string  `json:"provider"`
		TotalTokens  int64   `json:"total_tokens"`
		InputTokens  int64   `json:"input_tokens"`
		OutputTokens int64   `json:"output_tokens"`
		RequestCount int64   `json:"request_count"`
		Cost         float64 `json:"cost"`
	}

	usageByModelWithCost := make([]ModelUsageWithCost, len(usageByModel))
	var totalCost float64
	for i, u := range usageByModel {
		cost := calculateCost(u.Model, int(u.InputTokens), int(u.OutputTokens))
		totalCost += cost
		usageByModelWithCost[i] = ModelUsageWithCost{
			Model:        u.Model,
			Provider:     u.Provider,
			TotalTokens:  u.TotalTokens,
			InputTokens:  u.InputTokens,
			OutputTokens: u.OutputTokens,
			RequestCount: u.RequestCount,
			Cost:         cost,
		}
	}

	// Get summary
	totalTokens, totalRequests, err := h.tokenRepo.GetAnalyticsSummary(userID, days)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get analytics summary",
		})
	}

	// Get paginated history
	history, historyTotal, err := h.tokenRepo.GetUserHistory(userID, days, page, pageSize)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get token history",
		})
	}

	// Add cost to each history record
	type HistoryWithCost struct {
		UUID         uuid.UUID  `json:"uuid"`
		Provider     string     `json:"provider"`
		Model        string     `json:"model"`
		TotalTokens  int        `json:"total_tokens"`
		InputTokens  int        `json:"input_tokens"`
		OutputTokens int        `json:"output_tokens"`
		Cost         float64    `json:"cost"`
		CreatedAt    time.Time  `json:"created_at"`
		BoardUUID    *uuid.UUID `json:"board_uuid,omitempty"`
	}

	historyWithCost := make([]HistoryWithCost, len(history))
	for i, h := range history {
		historyWithCost[i] = HistoryWithCost{
			UUID:         h.UUID,
			Provider:     h.Provider,
			Model:        h.Model,
			TotalTokens:  h.TotalTokens,
			InputTokens:  h.InputTokens,
			OutputTokens: h.OutputTokens,
			Cost:         calculateCost(h.Model, h.InputTokens, h.OutputTokens),
			CreatedAt:    h.CreatedAt,
			BoardUUID:    h.BoardUUID,
		}
	}

	hasMore := int64(page*pageSize) < historyTotal

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"summary": fiber.Map{
			"total_tokens":   totalTokens,
			"total_requests": totalRequests,
			"total_cost":     totalCost,
			"days":           days,
		},
		"daily_usage":    dailyUsage,
		"usage_by_model": usageByModelWithCost,
		"history": fiber.Map{
			"records":  historyWithCost,
			"total":    historyTotal,
			"page":     page,
			"pageSize": pageSize,
			"hasMore":  hasMore,
		},
	})
}
