package agents

import (
	"context"
	"fmt"
	"log"
	"melina-studio-backend/internal/libraries"
	llmHandlers "melina-studio-backend/internal/llm_handlers"
	"melina-studio-backend/internal/melina/prompts"
	"melina-studio-backend/internal/melina/tools"
	"melina-studio-backend/internal/models"
	"os"
)

type Agent struct {
	llmClient llmHandlers.Client
}

func NewAgent(provider string) *Agent {
	var cfg llmHandlers.Config

	switch provider {
	case "openai":
		tools := tools.GetOpenAITools()
		cfg = llmHandlers.Config{
			Provider: llmHandlers.ProviderLangChainOpenAI,
			Model:    "gpt-4.1",
			APIKey:   os.Getenv("OPENAI_API_KEY"),
			Tools:    tools,
		}

	case "groq":
		tools := tools.GetGroqTools()
		cfg = llmHandlers.Config{
			Provider: llmHandlers.ProviderLangChainGroq,
			Model:    os.Getenv("GROQ_MODEL_NAME"),
			BaseURL:  os.Getenv("GROQ_BASE_URL"),
			APIKey:   os.Getenv("GROQ_API_KEY"),
			Tools:    tools,
		}

	case "vertex_anthropic":
		tools := tools.GetAnthropicTools()
		cfg = llmHandlers.Config{
			Provider: llmHandlers.ProviderVertexAnthropic,
			Tools:    tools,
		}
	case "gemini":
		cfg = llmHandlers.Config{
			Provider: llmHandlers.ProviderGemini,
			Tools:    tools.GetGeminiTools(),
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
	systemMessage := fmt.Sprintf(prompts.MASTER_PROMPT, boardId)
	
	// Build user message content - may include image if boardId is provided
	var userContent interface{} = message
	
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

// ProcessRequestStream processes a user message with optional board image
// boardId can be empty string if no image should be included
// client can be nil if streaming is not needed
func (a *Agent) ProcessRequestStream(ctx context.Context, hub *libraries.Hub, client *libraries.Client, message string, chatHistory []llmHandlers.Message, boardId string) (string, error) {
	// Build messages for the LLM
	systemMessage := fmt.Sprintf(prompts.MASTER_PROMPT, boardId)
	
	// Build user message content - may include image if boardId is provided
	var userContent interface{} = message
	
	messages := []llmHandlers.Message{}

	if len(chatHistory) >0 {
		messages = append(messages, chatHistory...)
	}

	messages = append(messages, llmHandlers.Message{
		Role:    models.RoleUser,
		Content: userContent,
	})

	// Call the LLM - pass client and boardId for streaming
	response, err := a.llmClient.ChatStream(ctx, hub, client, boardId, systemMessage, messages)
	if err != nil {
		return "", fmt.Errorf("LLM chat error: %w", err)
	}

	return response, nil
}

