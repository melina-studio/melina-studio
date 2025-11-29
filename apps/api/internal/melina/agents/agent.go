package agents

import (
	"context"
	"fmt"
	"log"
	llmHandlers "melina-studio-backend/internal/llm_handlers"
	"os"
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

func (a *Agent) ProcessRequest(ctx context.Context, message string) (string, error) {
	// Build messages for the LLM
	systemMessage := "You are a helpful AI assistant for a drawing board application."
	messages := []llmHandlers.Message{
		{
			Role:    "user",
			Content: message,
		},
	}

	// Call the LLM
	response, err := a.llmClient.Chat(ctx, systemMessage, messages)
	if err != nil {
		return "", fmt.Errorf("LLM chat error: %w", err)
	}

	return response, nil
}
