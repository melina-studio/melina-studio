package workflow

import (
	"log"
	"melina-studio-backend/internal/melina/agents"

	"github.com/gofiber/fiber/v2"
)

func TriggerChatWorkflow(c *fiber.Ctx) error {
	// Extract boardId from route params
	boardId := c.Params("boardId")

	var dto struct {
		Message string `json:"message"`
	}

	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if dto.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Message cannot be empty",
		})
	}

	// Default to vertex_gemini if not specified
	LLM := "groq"

	// Create agent on-demand with specified LLM provider
	agent := agents.NewAgent(LLM)

	// Call the agent to process the message with boardId (for image context)
	aiResponse, err := agent.ProcessRequest(c.Context(), dto.Message, boardId)
	if err != nil {
		log.Printf("Error processing request: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to process message",
		})
	}

	return c.JSON(fiber.Map{
		"message": aiResponse,
	})
}
