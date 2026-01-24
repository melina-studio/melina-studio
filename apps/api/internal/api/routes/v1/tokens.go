package v1

import (
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/handlers"
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
)

func registerTokens(app fiber.Router) {
    tokenRepo := repo.NewTokenConsumptionRepository(config.DB)
    tokenHandler := handlers.NewTokenHandler(tokenRepo)
    
    app.Get("/tokens/usage", tokenHandler.GetTokenConsumption)
}