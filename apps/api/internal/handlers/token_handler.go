package handlers

import (
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type TokenHandler struct {
    tokenRepo repo.TokenConsumptionRepoInterface
}

func NewTokenHandler(tokenRepo repo.TokenConsumptionRepoInterface) *TokenHandler {
    return &TokenHandler{tokenRepo: tokenRepo}
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