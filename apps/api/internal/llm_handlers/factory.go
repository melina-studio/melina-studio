package llmHandlers

import (
	"context"
	"fmt"
)

type Provider string

const (
	ProviderLangChainOpenAI Provider = "openai"           // LangChainGo (OpenAI)
	ProviderLangChainGroq   Provider = "groq"             // LangChainGo (Groq, uses BaseURL)
	ProviderVertexAnthropic Provider = "vertex_anthropic" // Your anthropic.go wrapper
	ProviderGemini    Provider = "gemini"
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

	case ProviderLangChainOpenAI:
		return NewLangChainClient(LangChainConfig{
			Model:       cfg.Model,
			APIKey:      cfg.APIKey,
			Tools:       cfg.Tools,
			Temperature: cfg.Temperature,
			MaxTokens:   cfg.MaxTokens,
		})

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
		return NewVertexAnthropicClient(cfg.Tools, cfg.Temperature, cfg.MaxTokens), nil

	case ProviderGemini:
		// Create background context for client initialization
		ctx := context.Background()
		client, err := NewGenaiGeminiClient(ctx, cfg.Tools, cfg.Temperature, cfg.MaxTokens)
		if err != nil {
			return nil, err
		}
		return client, nil

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
