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

// GeminiResponse contains the parsed response from Gemini
type GeminiResponse struct {
	TextContent  []string
	FunctionCalls []FunctionCall
	RawResponse   *genai.GenerateContentResponse
}

// FunctionCall represents a function call from Gemini
type FunctionCall struct {
	Name      string
	Arguments map[string]interface{}
}

// GenaiGeminiClient implements Client for Gemini via Google AI API
type GenaiGeminiClient struct {
	client  *genai.Client
	modelID string

	Temperature float32
	MaxTokens   int32
	Tools       []map[string]interface{}
}

func NewGenaiGeminiClient(ctx context.Context, tools []map[string]interface{}) (*GenaiGeminiClient, error) {
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
		Tools:       tools,
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

		// Handle content - can be string or []map[string]interface{} (for images, function calls, etc.)
		parts := []*genai.Part{}
		
		switch c := m.Content.(type) {
		case string:
			// Simple text message
			parts = append(parts, &genai.Part{Text: c})
			
		case []map[string]interface{}:
			// Multi-part content (text + images + function calls/responses)
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
					
				case "function_call":
					// Handle function call from assistant (model role)
					if fn, ok := block["function"].(map[string]interface{}); ok {
						name, _ := fn["name"].(string)
						args, _ := fn["arguments"].(map[string]interface{})
						
						parts = append(parts, &genai.Part{
							FunctionCall: &genai.FunctionCall{
								Name: name,
								Args: args,
							},
						})
					}
					
				case "function_response":
					// Handle function response from user
					if fn, ok := block["function"].(map[string]interface{}); ok {
						name, _ := fn["name"].(string)
						responseStr, _ := fn["response"].(string)
						
						// Parse response string to map
						var responseMap map[string]interface{}
						if err := json.Unmarshal([]byte(responseStr), &responseMap); err != nil {
							responseMap = make(map[string]interface{})
						}
						
						parts = append(parts, &genai.Part{
							FunctionResponse: &genai.FunctionResponse{
								Name:     name,
								Response: responseMap,
							},
						})
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

// convertToolsToGenaiTools converts tool definitions from map format to genai.Tool format
func convertToolsToGenaiTools(tools []map[string]interface{}) []*genai.Tool {
	if len(tools) == 0 {
		return nil
	}

	genaiTools := make([]*genai.Tool, 0, len(tools))
	for _, toolMap := range tools {
		// Handle OpenAI-style format: {"type": "function", "function": {...}}
		if toolType, ok := toolMap["type"].(string); ok && toolType == "function" {
			if fn, ok := toolMap["function"].(map[string]interface{}); ok {
				name, _ := fn["name"].(string)
				description, _ := fn["description"].(string)
				parameters, _ := fn["parameters"].(map[string]interface{})

				// Convert parameters map to genai.Schema
				// The Schema expects a JSON schema structure
				paramsJSON, err := json.Marshal(parameters)
				if err != nil {
					continue // Skip invalid tool
				}

				// Parse JSON schema into genai.Schema
				var schema genai.Schema
				if err := json.Unmarshal(paramsJSON, &schema); err != nil {
					continue // Skip if schema parsing fails
				}

				genaiTool := &genai.Tool{
					FunctionDeclarations: []*genai.FunctionDeclaration{
						{
							Name:        name,
							Description: description,
							Parameters:  &schema,
						},
					},
				}
				genaiTools = append(genaiTools, genaiTool)
			}
		}
	}

	return genaiTools
}

// callGeminiWithMessages calls Gemini API and returns parsed response
func (v *GenaiGeminiClient) callGeminiWithMessages(ctx context.Context, systemMessage string, messages []Message) (*GeminiResponse, error) {
	systemText, contents, err := convertMessagesToGenaiContent(messages)
	if err != nil {
		return nil, fmt.Errorf("convert messages: %w", err)
	}

	// Convert tools to genai.Tool format
	genaiTools := convertToolsToGenaiTools(v.Tools)

	// Build generation config
	genConfig := &genai.GenerateContentConfig{
		Temperature:     &v.Temperature,
		MaxOutputTokens: v.MaxTokens,
		Tools:           genaiTools,
	}

	// Add system instruction if exists
	if systemMessage != "" || systemText != "" {
		sysMsg := systemMessage
		if sysMsg == "" {
			sysMsg = systemText
		}
		systemPart := &genai.Part{Text: sysMsg}
		sysContent := &genai.Content{
			Parts: []*genai.Part{systemPart},
		}
		genConfig.SystemInstruction = sysContent
	}

	// Call GenerateContent
	resp, err := v.client.Models.GenerateContent(ctx, v.modelID, contents, genConfig)
	if err != nil {
		return nil, fmt.Errorf("gemini GenerateContent: %w", err)
	}

	if resp == nil || len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("gemini returned no candidates")
	}

	// Parse response
	gr := &GeminiResponse{
		RawResponse: resp,
	}

	cand := resp.Candidates[0]
	if cand.Content == nil {
		return gr, nil
	}

	// Extract text and function calls from parts
	for _, part := range cand.Content.Parts {
		if part.Text != "" {
			gr.TextContent = append(gr.TextContent, part.Text)
		}
		if part.FunctionCall != nil {
			// Extract function arguments (already a map)
			args := make(map[string]interface{})
			if part.FunctionCall.Args != nil {
				args = part.FunctionCall.Args
			}

			gr.FunctionCalls = append(gr.FunctionCalls, FunctionCall{
				Name:      part.FunctionCall.Name,
				Arguments: args,
			})
		}
	}

	return gr, nil
}

// ChatWithTools handles tool execution loop similar to Anthropic's implementation
func (v *GenaiGeminiClient) ChatWithTools(ctx context.Context, systemMessage string, messages []Message) (*GeminiResponse, error) {
	const maxIterations = 8

	workingMessages := make([]Message, 0, len(messages)+6)
	workingMessages = append(workingMessages, messages...)

	var lastResp *GeminiResponse
	for iter := 0; iter < maxIterations; iter++ {
		gr, err := v.callGeminiWithMessages(ctx, systemMessage, workingMessages)
		if err != nil {
			return nil, fmt.Errorf("callGeminiWithMessages: %w", err)
		}
		lastResp = gr

		// If no function calls, we're done
		if len(gr.FunctionCalls) == 0 {
			return gr, nil
		}

		// Convert FunctionCalls to common ToolCall format
		toolCalls := make([]ToolCall, len(gr.FunctionCalls))
		for i, fc := range gr.FunctionCalls {
			toolCalls[i] = ToolCall{
				ID:       "", // Gemini doesn't use IDs
				Name:     fc.Name,
				Input:    fc.Arguments,
				Provider: "gemini",
			}
		}

		// Execute tools using common executor
		execResults := ExecuteTools(ctx, toolCalls)

		// Format results for Gemini
		functionResults := []map[string]interface{}{}
		var imageContentBlocks []map[string]interface{} // Collect images to add separately
		
		for _, execResult := range execResults {
			funcResp, imgBlocks := FormatGeminiToolResult(execResult)
			functionResults = append(functionResults, funcResp)
			imageContentBlocks = append(imageContentBlocks, imgBlocks...)
		}

		// Append assistant message with function calls
		assistantParts := []map[string]interface{}{}
		for _, text := range gr.TextContent {
			assistantParts = append(assistantParts, map[string]interface{}{
				"type": "text",
				"text": text,
			})
		}
		for _, fc := range gr.FunctionCalls {
			assistantParts = append(assistantParts, map[string]interface{}{
				"type": "function_call",
				"function": map[string]interface{}{
					"name":      fc.Name,
					"arguments": fc.Arguments,
				},
			})
		}
		workingMessages = append(workingMessages, Message{
			Role:    "assistant",
			Content: assistantParts,
		})

		// Append user message with function results
		workingMessages = append(workingMessages, Message{
			Role:    "user",
			Content: functionResults,
		})
		
		// If we have image content blocks, add them as a separate user message
		// This allows Gemini to actually "see" the image (function responses are JSON-only)
		if len(imageContentBlocks) > 0 {
			workingMessages = append(workingMessages, Message{
				Role:    "user",
				Content: imageContentBlocks,
			})
		}

		// Small throttle
		time.Sleep(50 * time.Millisecond)
	}

	return lastResp, fmt.Errorf("max iterations reached (%d) while resolving tools", maxIterations)
}

func (v *GenaiGeminiClient) Chat(ctx context.Context, systemMessage string, messages []Message) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	resp, err := v.ChatWithTools(ctx, systemMessage, messages)
	if err != nil {
		return "", err
	}

	if len(resp.TextContent) == 0 {
		return "", fmt.Errorf("gemini returned no text content")
	}

	return strings.Join(resp.TextContent, "\n\n"), nil
}
