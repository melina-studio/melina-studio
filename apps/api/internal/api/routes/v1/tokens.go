package v1

import (
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/handlers"
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
)

func registerTokens(app fiber.Router) {
	tokenRepo := repo.NewTokenConsumptionRepository(config.DB)
	subscriptionPlanRepo := repo.NewSubscriptionPlanRepository(config.DB)
	tokenHandler := handlers.NewTokenHandler(tokenRepo, subscriptionPlanRepo)

	app.Get("/tokens/usage", tokenHandler.GetTokenConsumption)
	app.Get("/tokens/subscription-status", tokenHandler.GetSubscriptionStatus)
	app.Get("/subscription-plans", tokenHandler.GetAllSubscriptionPlans)
}
