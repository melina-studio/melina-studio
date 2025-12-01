package agents

import (
	"context"
	"fmt"
	"log"
	llmHandlers "melina-studio-backend/internal/llm_handlers"
	"melina-studio-backend/internal/melina/helpers"
	"melina-studio-backend/internal/melina/prompts"
	"melina-studio-backend/internal/models"
	"os"
	"path/filepath"
)

type Agent struct {
	llmClient llmHandlers.Client
}

func NewAgent(provider string) *Agent {
	var cfg llmHandlers.Config

	switch provider {
	case "openai":
		cfg = llmHandlers.Config{
			Provider: llmHandlers.ProviderLangChainOpenAI,
			Model:    "gpt-4.1",
			APIKey:   os.Getenv("OPENAI_API_KEY"),
		}

	case "groq":
		cfg = llmHandlers.Config{
			Provider: llmHandlers.ProviderLangChainGroq,
			Model:    os.Getenv("GROQ_MODEL_NAME"),
			BaseURL:  os.Getenv("GROQ_BASE_URL"),
			APIKey:   os.Getenv("GROQ_API_KEY"),
		}

	case "vertex_anthropic":
		cfg = llmHandlers.Config{
			Provider: llmHandlers.ProviderVertexAnthropic,
			Tools:    nil,
		}
	case "gemini":
		cfg = llmHandlers.Config{
			Provider: llmHandlers.ProviderGemini,
			Tools:    nil,
		}

	default:
		log.Fatalf("Unknown provider: %s. Valid options: openai, groq, vertex_anthropic", provider)
	}

	llmClient, err := llmHandlers.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize LLM client (%s): %v", provider, err)
	}

	return &Agent{
		llmClient: llmClient,
	}
}

// ProcessRequest processes a user message with optional board image
// boardId can be empty string if no image should be included
func (a *Agent) ProcessRequest(ctx context.Context, message string, chatHistory []llmHandlers.Message, boardId string) (string, error) {
	// Build messages for the LLM
	systemMessage := prompts.MASTER_PROMPT
	
	// Build user message content - may include image if boardId is provided
	var userContent interface{} = message
	
	if boardId != "" {
		// Try to load and encode the board image
		imagePath := filepath.Join("temp", "images", fmt.Sprintf("%s.png", boardId))
		imageData, err := os.ReadFile(imagePath)
		if err == nil {
			// Image file exists - format content based on provider
			userContent = helpers.FormatMessageWithImage(message, imageData)
		} else {
			// Image not found - log but continue with text only
			log.Printf("Warning: Board image not found at %s, continuing with text only: %v", imagePath, err)
		}
	}

	messages := []llmHandlers.Message{}

	if len(chatHistory) >0 {
		messages = append(messages, chatHistory...)
	}

	messages = append(messages, llmHandlers.Message{
		Role:    models.RoleUser,
		Content: userContent,
	})


	// Call the LLM
	response, err := a.llmClient.Chat(ctx, systemMessage, messages)
	if err != nil {
		return "", fmt.Errorf("LLM chat error: %w", err)
	}

	return response, nil
}

