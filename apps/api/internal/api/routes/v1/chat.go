package v1

import (
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/handlers"
	"melina-studio-backend/internal/melina/workflow"
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
)

func registerChat(app fiber.Router) {
	chatRepo := repo.NewChatRepository(config.DB)
	boardDataRepo := repo.NewBoardDataRepository(config.DB)
	boardRepo := repo.NewBoardRepository(config.DB)
	chatHandler := handlers.NewChatHandler(chatRepo)
	wf := workflow.NewWorkflow(chatRepo, boardDataRepo, boardRepo)

	app.Post("/chat/:boardId", wf.TriggerChatWorkflow)
	app.Get("/chat/:boardId", chatHandler.GetChatsByBoardId)
}
