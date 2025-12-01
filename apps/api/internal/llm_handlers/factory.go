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

	// Anthropic configs
	Tools []map[string]interface{}
}

func New(cfg Config) (Client, error) {
	switch cfg.Provider {

	case ProviderLangChainOpenAI:
		return NewLangChainClient(LangChainConfig{
			Model:  cfg.Model,
			APIKey: cfg.APIKey,
		})

	case ProviderLangChainGroq:
		return NewLangChainClient(LangChainConfig{
			Model:   cfg.Model,
			BaseURL: cfg.BaseURL, // e.g. https://api.groq.com/openai/v1
			APIKey:  cfg.APIKey,
		})

	case ProviderVertexAnthropic:
		return NewVertexAnthropicClient(cfg.Tools), nil

	case ProviderGemini:
		// Create background context for client initialization
		ctx := context.Background()
		client, err := NewGenaiGeminiClient(ctx)
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
