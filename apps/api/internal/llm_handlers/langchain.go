package llmHandlers

import (
	"context"
	"fmt"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
)

type LangChainClient struct {
	llm llms.Model
}

type LangChainConfig struct {
	Model   string // e.g. "gpt-4.1", "llama-3.1-70b-versatile"
	BaseURL string // optional: for Groq or other OpenAI-compatible APIs
	APIKey  string // if not set, it’ll fall back to env
}

func NewLangChainClient(cfg LangChainConfig) (*LangChainClient, error) {
	opts := []openai.Option{
		openai.WithModel(cfg.Model),
	}
	if cfg.BaseURL != "" {
		opts = append(opts, openai.WithBaseURL(cfg.BaseURL))
	}
	if cfg.APIKey != "" {
		opts = append(opts, openai.WithToken(cfg.APIKey))
	}

	llm, err := openai.New(opts...)
	if err != nil {
		return nil, fmt.Errorf("create langchain openai client: %w", err)
	}

	return &LangChainClient{llm: llm}, nil
}

func (c *LangChainClient) Chat(ctx context.Context, messages []Message) (string, error) {
	msgContents := make([]llms.MessageContent, 0, len(messages))
	for _, m := range messages {
		// Convert content to string
		contentStr, ok := m.Content.(string)
		if !ok {
			return "", fmt.Errorf("message content must be string for langchain")
		}

		var msgType llms.ChatMessageType
		switch m.Role {
		case "system":
			msgType = llms.ChatMessageTypeSystem
		case "user":
			msgType = llms.ChatMessageTypeHuman
		case "assistant":
			msgType = llms.ChatMessageTypeAI
		default:
			msgType = llms.ChatMessageTypeHuman
		}

		msgContents = append(msgContents, llms.TextParts(msgType, contentStr))
	}

	resp, err := c.llm.GenerateContent(ctx, msgContents)
	if err != nil {
		return "", err
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no choices returned from LLM")
	}

	return resp.Choices[0].Content, nil
}

/*

func initLangChain() llm.Client {
	cfg := llm.LangChainConfig{
		Model:   "gpt-4.1",
		BaseURL: "", // set for Groq/GPT-compatible endpoints
		APIKey:  "", // optional: falls back to env
	}
	client, err := llm.NewLangChainClient(cfg)
	if err != nil {
		log.Fatalf("langchain client init: %v", err)
	}
	return client
}

*/
