package routes

import (
	"melina-studio-backend/internal/api/routes/v1"

	"github.com/gofiber/fiber/v2"
)

func Register(app *fiber.App) {
	// API v1 group
	api := app.Group("/api")
	v1Group := api.Group("/v1")

	// Register v1 routes
	v1.RegisterRoutes(v1Group)
}
