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

func (c *LangChainClient) Chat(ctx context.Context, systemMessage string, messages []Message) (string, error) {
	msgContents := make([]llms.MessageContent, 0, len(messages))
	if systemMessage != "" {
		msgContents = append(msgContents, llms.TextParts(llms.ChatMessageTypeSystem, systemMessage))
	}
	for _, m := range messages {
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

		// Handle content - can be string or []map[string]interface{} (for images)
		switch content := m.Content.(type) {
		case string:
			// Simple text message
			msgContents = append(msgContents, llms.TextParts(msgType, content))
			
		case []map[string]interface{}:
			// Multi-part content (text + images)
			// Build parts array for multimodal content
			parts := []llms.ContentPart{}
			
			for _, block := range content {
				blockType, _ := block["type"].(string)
				
				switch blockType {
				case "text":
					if text, ok := block["text"].(string); ok {
						parts = append(parts, llms.TextPart(text))
					}
					
				case "image":
					if source, ok := block["source"].(map[string]interface{}); ok {
						mediaType, _ := source["media_type"].(string)
						dataStr, _ := source["data"].(string)
						
						// Groq/OpenAI-compatible APIs expect image_url format with data URI
						// Format: data:image/png;base64,{base64string}
						dataURI := fmt.Sprintf("data:%s;base64,%s", mediaType, dataStr)
						parts = append(parts, llms.ImageURLPart(dataURI))
					}
				}
			}
			
			// Create MessageContent with all parts
			if len(parts) > 0 {
				msgContents = append(msgContents, llms.MessageContent{
					Role:  msgType,
					Parts: parts,
				})
			}
			
		default:
			return "", fmt.Errorf("unsupported message content type for langchain: %T", m.Content)
		}
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
