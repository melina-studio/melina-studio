package v1

import (
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/handlers"
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
)

func registerBoard(r fiber.Router) {
	// Initialize handler
	boardRepo := repo.NewBoardRepository(config.DB)
	boardDataRepo := repo.NewBoardDataRepository(config.DB)
	boardHandler := handlers.NewBoardHandler(boardRepo, boardDataRepo)

	// Register routes
	r.Get("/boards", boardHandler.GetAllBoards)
	r.Post("/boards", boardHandler.CreateBoard)
	r.Get("/boards/:boardId", boardHandler.GetBoardByID)
	r.Post("/boards/:boardId/save", boardHandler.SaveData)
	r.Delete("/boards/:boardId/clear", boardHandler.ClearBoard)
}
