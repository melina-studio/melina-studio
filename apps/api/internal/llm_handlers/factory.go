package llmHandlers

import (
	"context"
	"fmt"
)

type Provider string

const (
	ProviderOpenAI          Provider = "openai"           // Direct OpenAI SDK (supports thinking/reasoning)
	ProviderLangChainGroq   Provider = "groq"             // LangChainGo (Groq, uses BaseURL)
	ProviderVertexAnthropic Provider = "vertex_anthropic" // Your anthropic.go wrapper
	ProviderGemini          Provider = "gemini"
	ProviderOpenRouter      Provider = "openrouter" // OpenRouter (supports Kimi-K2.5, etc.)
)

type Config struct {
	Provider Provider

	// LangChain configs
	Model   string
	BaseURL string
	APIKey  string

	// Common configs (applies to all providers)
	Temperature *float32 // Optional: nil means use default
	MaxTokens   *int     // Optional: nil means use default

	// Anthropic configs
	Tools []map[string]interface{}
}

func New(cfg Config) (Client, error) {
	switch cfg.Provider {

	case ProviderOpenAI:
		return NewOpenAIClient(cfg.Model, cfg.Tools, cfg.Temperature, cfg.MaxTokens)

	case ProviderLangChainGroq:
		return NewLangChainClient(LangChainConfig{
			Model:       cfg.Model,
			BaseURL:     cfg.BaseURL, // e.g. https://api.groq.com/openai/v1
			APIKey:      cfg.APIKey,
			Tools:       cfg.Tools,
			Temperature: cfg.Temperature,
			MaxTokens:   cfg.MaxTokens,
		})

	case ProviderVertexAnthropic:
		return NewVertexAnthropicClient(cfg.Model, cfg.Tools, cfg.Temperature, cfg.MaxTokens), nil

	case ProviderGemini:
		// Create background context for client initialization
		ctx := context.Background()
		client, err := NewGenaiGeminiClient(ctx, cfg.Tools, cfg.Temperature, cfg.MaxTokens)
		if err != nil {
			return nil, err
		}
		return client, nil

	case ProviderOpenRouter:
		return NewOpenRouterClient(cfg.Model, cfg.Temperature, cfg.MaxTokens, cfg.Tools)

	default:
		return nil, fmt.Errorf("unknown LLM provider: %s", cfg.Provider)
	}
}

/*

cfg := llm.Config{
    Provider: llm.ProviderVertexAnthropic,
    Tools:    myToolsMeta,
}

client, _ := llm.New(cfg)

for groq:
cfg := llm.Config{
    Provider: llm.ProviderLangChainGroq,
    Model:    "llama-3.1-70b",
    BaseURL:  "https://api.groq.com/openai/v1",
    APIKey:   os.Getenv("GROQ_API_KEY"),
}

client, _ := llm.New(cfg)

// for open ai:
cfg := llm.Config{
    Provider: llm.ProviderLangChainOpenAI,
    Model:    "gpt-4.1",
    APIKey:   os.Getenv("OPENAI_API_KEY"),
}
client, _ := llm.New(cfg)


*/
