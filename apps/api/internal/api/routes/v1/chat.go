package v1

import (
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/handlers"
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

// ChatRoutes is the group of routes for the chat API.
func registerChat(app fiber.Router) {

	chatRepo := repo.NewChatRepository(config.DB)
	chatHandler := handlers.NewChatHandler(chatRepo)
	workflow := workflow.NewWorkflow(chatRepo)

	// No initialization needed - everything happens on request
	app.Post("/chat/:boardId", workflow.TriggerChatWorkflow)
	app.Get("/chat/:boardId", chatHandler.GetChatsByBoardId)
	
	// Use the Hub-based WebSocket handler
	app.Get("/ws", libraries.WebSocketHandler(hub , workflow))
}