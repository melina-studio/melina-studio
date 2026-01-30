package v1

import (
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/handlers"
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
)

func registerChat(app fiber.Router) {
	chatRepo := repo.NewChatRepository(config.DB)
	tempUploadRepo := repo.NewTempUploadRepository(config.DB)
	chatHandler := handlers.NewChatHandler(chatRepo, tempUploadRepo)

	app.Get("/chat/:boardId", chatHandler.GetChatsByBoardId)
	app.Post("/chat/:boardId/upload-image", chatHandler.UploadImage)
}
