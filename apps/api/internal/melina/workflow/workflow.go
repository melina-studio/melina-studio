package workflow

import (
	"context"
	"fmt"
	"log"
	"strings"

	"melina-studio-backend/internal/libraries"
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

	// Default to gemini if not specified
	LLM := "groq"
	temperature := float32(0.2)
	maxTokens := 1024

	// Create agent on-demand with specified LLM provider
	agent := agents.NewAgent(LLM, &temperature, &maxTokens)

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

func (w *Workflow) ProcessChatMessage(hub *libraries.Hub, client *libraries.Client, cfg *libraries.WorkflowConfig) {
	// get chat history from the database
	boardIdUUID, err := uuid.Parse(cfg.BoardId)
	if err != nil {
		libraries.SendErrorMessage(hub, client, "Invalid board ID")
		return
	}

	// get chat history from the database
	chatHistory, err := w.chatRepo.GetChatHistory(boardIdUUID, 20)
	if err != nil {
		libraries.SendErrorMessage(hub, client, "Failed to get chat history")
		return
	}

	// create an agent
	LLM := cfg.Model
	agent := agents.NewAgent(LLM, cfg.Temperature, cfg.MaxTokens)


	// send an event that the chat is starting
	libraries.SendEventType(hub , client, libraries.WebSocketMessageTypeChatStarting)

	// process the chat message - pass client and boardId for streaming
	aiResponse, err := agent.ProcessRequestStream(context.Background(), hub, client, cfg.Message.Message, chatHistory, cfg.BoardId , cfg.ActiveTheme)
	if err != nil {
		// Log the error for debugging but still try to send a helpful message
		log.Printf("Error processing chat message: %v", err)
		
		// Send a more informative error message
		errorMsg := fmt.Sprintf("I encountered an issue while processing your request: %v. Some shapes may have been created successfully. Please check the canvas.", err)
		libraries.SendChatMessageResponse(hub, client, libraries.WebSocketMessageTypeChatResponse, &libraries.ChatMessageResponsePayload{
			BoardId: cfg.BoardId,
			Message: errorMsg,
		})
		
		// Still try to save what we have (even if partial)
		if aiResponse != "" {
			_, _, saveErr := w.chatRepo.CreateHumanAndAiMessages(boardIdUUID, cfg.Message.Message, aiResponse)
			if saveErr != nil {
				log.Printf("Failed to save chat messages: %v", saveErr)
			}
		}
		
		// Send completion event even on error
		libraries.SendChatMessageResponse(hub, client, libraries.WebSocketMessageTypeChatCompleted, &libraries.ChatMessageResponsePayload{
			BoardId: cfg.BoardId,
			Message: aiResponse,
		})
		return
	}

	// Safety net: if aiResponse is empty, provide a default message to prevent database issues
	if strings.TrimSpace(aiResponse) == "" {
		log.Printf("Warning: AI response is empty after processing, providing default message")
		aiResponse = "I processed your request but was unable to generate a text response. Please check the board for any changes that were made."
	}

	// after get successful response, create a chat in the database
	human_message_id, ai_message_id, err := w.chatRepo.CreateHumanAndAiMessages(boardIdUUID, cfg.Message.Message, aiResponse)
	if err != nil {
		libraries.SendErrorMessage(hub, client, "Failed to create human and ai messages")
		return
	}

	// send an event that the chat is completed
	libraries.SendChatMessageResponse(hub , client, libraries.WebSocketMessageTypeChatCompleted, &libraries.ChatMessageResponsePayload{
		BoardId: cfg.BoardId,
		Message: aiResponse,
		HumanMessageId: human_message_id.String(),
		AiMessageId: ai_message_id.String(),
	})

}