package llmHandlers

import (
	"context"
	"encoding/base64"
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
// Supports both text and image content
func convertMessagesToGenaiContent(messages []Message) (string, []*genai.Content, error) {
	systemParts := []string{}
	contents := []*genai.Content{}

	for _, m := range messages {
		role := strings.ToLower(strings.TrimSpace(string(m.Role)))

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

		// Map role: "assistant" -> "model", "user" -> "user"
		roleOut := "user"
		if role == "assistant" || role == "model" {
			roleOut = "model"
		}

		// Handle content - can be string or []map[string]interface{} (for images)
		parts := []*genai.Part{}
		
		switch c := m.Content.(type) {
		case string:
			// Simple text message
			parts = append(parts, &genai.Part{Text: c})
			
		case []map[string]interface{}:
			// Multi-part content (text + images)
			for _, block := range c {
				blockType, _ := block["type"].(string)
				
				switch blockType {
				case "text":
					if text, ok := block["text"].(string); ok {
						parts = append(parts, &genai.Part{Text: text})
					}
					
				case "image":
					if source, ok := block["source"].(map[string]interface{}); ok {
						mediaType, _ := source["media_type"].(string)
						dataStr, _ := source["data"].(string)
						
						// Decode base64 image data
						imageData, err := base64.StdEncoding.DecodeString(dataStr)
						if err == nil {
							// Create image part for Gemini
							parts = append(parts, &genai.Part{
								InlineData: &genai.Blob{
									MIMEType: mediaType,
									Data:     imageData,
								},
							})
						}
					}
				}
			}
			
		default:
			// Fallback: convert to JSON string
			b, _ := json.Marshal(c)
			parts = append(parts, &genai.Part{Text: string(b)})
		}

		if len(parts) > 0 {
			contents = append(contents, &genai.Content{
				Role:  roleOut,
				Parts: parts,
			})
		}
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
