package v1

import (
	"melina-studio-backend/internal/auth"
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/melina/workflow"
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
)

var hub *libraries.Hub

func init() {
	// Initialize the Hub once
	hub = libraries.NewHub()
	// Start the Hub in a goroutine
	go hub.Run()
}

func RegisterRoutes(r fiber.Router) {
	// Public routes (no auth required)
	registerAuthPublic(r.Group("/auth"))
	registerWebSocket(r)

	// Protected routes (requires auth)
	protected := r.Group("", auth.AuthMiddleware())
	registerBoard(protected)
	registerChat(protected)
	registerAuthProtected(protected.Group("/auth"))
}

func registerWebSocket(r fiber.Router) {
	chatRepo := repo.NewChatRepository(config.DB)
	boardDataRepo := repo.NewBoardDataRepository(config.DB)
	boardRepo := repo.NewBoardRepository(config.DB)
	wf := workflow.NewWorkflow(chatRepo, boardDataRepo, boardRepo)

	// WebSocket route - auth handled in websocket handler
	r.Get("/ws", libraries.WebSocketHandler(hub, wf))
}
