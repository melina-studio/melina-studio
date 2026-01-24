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
