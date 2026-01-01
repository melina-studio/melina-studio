package workflow

import (
	"fmt"
	"log"
	"melina-studio-backend/internal/melina/agents"
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)


type Workflow struct {
	chatRepo repo.ChatRepoInterface
}

func NewWorkflow(chatRepo repo.ChatRepoInterface) *Workflow {
	return &Workflow{chatRepo: chatRepo}
}

func (w *Workflow) TriggerChatWorkflow(c *fiber.Ctx) error {
	// Extract boardId from route params
	boardId := c.Params("boardId")
	// convert boardId to uuid
	boardUUID, err := uuid.Parse(boardId)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid board ID: %v", err),
		})
	}
	var dto struct {
		Message string `json:"message"`
	}

	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid request body: %v", err),
		})
	}

	if dto.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Message cannot be empty: %v", err),
		})
	}

	// Default to vertex_gemini if not specified
	LLM := "vertex_anthropic"

	// Create agent on-demand with specified LLM provider
	agent := agents.NewAgent(LLM)

	// get chat history from the database
	chatHistory, err := w.chatRepo.GetChatHistory(boardUUID, 20)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to get chat history: %v", err),
		})
	}


	// Call the agent to process the message with boardId (for image context)
	aiResponse, err := agent.ProcessRequest(c.Context(), dto.Message , chatHistory, boardId)
	if err != nil {
		log.Printf("Error processing request: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to process message: %v", err),
		})
	}

	// after get successful response, create a chat in the database
	human_message_id , ai_message_id , err := w.chatRepo.CreateHumanAndAiMessages(boardUUID, dto.Message, aiResponse)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to create human and ai messages: %v", err),
		})
	}

	return c.JSON(fiber.Map{
		"message": aiResponse,
		"human_message_id": human_message_id.String(),
		"ai_message_id": ai_message_id.String(),
	})
}
