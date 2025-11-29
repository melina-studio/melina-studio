package v1

import (
	"melina-studio-backend/internal/melina/workflow"

	"github.com/gofiber/fiber/v2"
)

// ChatRoutes is the group of routes for the chat API.
func registerChat(app fiber.Router) {
	// No initialization needed - everything happens on request
	app.Post("/chat/:boardId", workflow.TriggerChatWorkflow)
}
