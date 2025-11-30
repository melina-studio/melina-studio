package llmHandlers

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"google.golang.org/genai"
)

// GenaiGeminiClient implements Client for Gemini via Google AI API
type GenaiGeminiClient struct {
	client  *genai.Client
	modelID string

	Temperature float32
	MaxTokens   int32
}

func NewGenaiGeminiClient(ctx context.Context) (*GenaiGeminiClient, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	modelID := os.Getenv("GEMINI_MODEL_ID")

	if apiKey == "" || modelID == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY and GEMINI_MODEL_ID must be set")
	}

	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})

	if err != nil {
		return nil, fmt.Errorf("genai.NewClient: %w", err)
	}

	return &GenaiGeminiClient{
		client:      client,
		modelID:     modelID,
		Temperature: 0.2,
		MaxTokens:   1024,
	}, nil
}

// convertMessagesToGenaiContent converts our Message format to genai.Content
func convertMessagesToGenaiContent(messages []Message) (string, []*genai.Content, error) {
	systemParts := []string{}
	contents := []*genai.Content{}

	for _, m := range messages {
		role := strings.ToLower(strings.TrimSpace(m.Role))

		// Gather system parts separately
		if role == "system" {
			switch c := m.Content.(type) {
			case string:
				systemParts = append(systemParts, c)
			default:
				b, _ := json.Marshal(c)
				systemParts = append(systemParts, string(b))
			}
			continue
		}

		// Convert content to text
		var text string
		switch c := m.Content.(type) {
		case string:
			text = c
		default:
			b, _ := json.Marshal(c)
			text = string(b)
		}

		// Map role: "assistant" -> "model", "user" -> "user"
		roleOut := "user"
		if role == "assistant" || role == "model" {
			roleOut = "model"
		}

		textPart := &genai.Part{Text: text}
		contents = append(contents, &genai.Content{
			Role:  roleOut,
			Parts: []*genai.Part{textPart},
		})
	}

	systemText := strings.Join(systemParts, "\n")
	return systemText, contents, nil
}

func (v *GenaiGeminiClient) Chat(ctx context.Context, systemMessage string, messages []Message) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	_, contents, err := convertMessagesToGenaiContent(messages)
	if err != nil {
		return "", fmt.Errorf("convert messages: %w", err)
	}

	// Build generation config
	genConfig := &genai.GenerateContentConfig{
		Temperature:     &v.Temperature,
		MaxOutputTokens: v.MaxTokens,
	}

	// Add system instruction if exists
	if systemMessage != "" {
		systemPart := &genai.Part{Text: systemMessage}
		sysContent := &genai.Content{
			Parts: []*genai.Part{systemPart},
		}
		genConfig.SystemInstruction = sysContent
	}

	// Call GenerateContent with the model ID, contents, and config
	resp, err := v.client.Models.GenerateContent(ctx, v.modelID, contents, genConfig)
	if err != nil {
		return "", fmt.Errorf("gemini GenerateContent: %w", err)
	}

	if resp == nil || len(resp.Candidates) == 0 {
		return "", fmt.Errorf("gemini returned no candidates")
	}

	// Collect output text from parts
	var sb strings.Builder
	for _, cand := range resp.Candidates {
		if cand.Content != nil {
			for _, part := range cand.Content.Parts {
				// many SDKs store text as a field (string)
				if part.Text != "" {
					sb.WriteString(part.Text)
				}
			}
		}
	}

	return sb.String(), nil
}
