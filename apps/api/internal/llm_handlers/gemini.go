package llmHandlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/models"
	"os"
	"strings"
	"time"

	"google.golang.org/genai"
)

// GeminiResponse contains the parsed response from Gemini
type GeminiResponse struct {
	TextContent   []string
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

func NewGenaiGeminiClient(ctx context.Context, tools []map[string]interface{}, temperature *float32, maxTokens *int) (*GenaiGeminiClient, error) {
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

	// Set defaults if not provided
	tempValue := float32(0.2)
	if temperature != nil {
		tempValue = *temperature
	}

	maxTokensValue := int32(1024)
	if maxTokens != nil {
		maxTokensValue = int32(*maxTokens)
	}

	return &GenaiGeminiClient{
		client:      client,
		modelID:     modelID,
		Temperature: tempValue,
		MaxTokens:   maxTokensValue,
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
func (v *GenaiGeminiClient) callGeminiWithMessages(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext) (*GeminiResponse, error) {
	systemText, contents, err := convertMessagesToGenaiContent(messages)
	if err != nil {
		return nil, fmt.Errorf("convert messages: %w", err)
	}

	// Convert tools to genai.Tool format
	genaiTools := convertToolsToGenaiTools(v.Tools)

	// need to hanlde streaming later

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

	var resp *genai.GenerateContentResponse

	// Use streaming if streaming context is provided
	if streamCtx != nil && streamCtx.Client != nil {
		// Use GenerateContentStream for real-time tokens
		iterator := v.client.Models.GenerateContentStream(ctx, v.modelID, contents, genConfig)

		var lastChunk *genai.GenerateContentResponse
		var accumulatedText strings.Builder

		// Iterate over streaming chunks
		// Note: chunk and chunkErr are the loop variables, not shadowing outer resp
		for chunk, chunkErr := range iterator {
			if chunkErr != nil {
				return nil, fmt.Errorf("gemini stream error: %w", chunkErr)
			}

			// Store the last chunk (contains final state including function calls)
			lastChunk = chunk

			// Extract text from the current chunk and stream it
			// Note: chunk.Text() returns only the incremental text (new token)
			token := chunk.Text()
			if token != "" {
				// Accumulate the full text
				accumulatedText.WriteString(token)

				// Send streaming chunk to client
				payload := &libraries.ChatMessageResponsePayload{
					Message: token,
				}
				// Only include BoardId if it's not empty
				if streamCtx.BoardId != "" {
					payload.BoardId = streamCtx.BoardId
				}
				libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
			}
		}

		// Use the last chunk as the base for the final response
		// This contains the complete response structure including any function calls
		resp = lastChunk

		if resp == nil {
			return nil, fmt.Errorf("gemini stream returned no response")
		}

		// IMPORTANT: The last chunk's Content.Parts might only contain the last token
		// We need to ensure the full accumulated text is in the response
		// Update the response to include the full accumulated text
		if len(resp.Candidates) > 0 {
			if resp.Candidates[0].Content != nil && len(resp.Candidates[0].Content.Parts) > 0 {
				// Replace the text in the first part with the accumulated full text
				// This ensures the response parsing later gets the complete text
				fullText := accumulatedText.String()
				if fullText != "" {
					// Find the first text part and update it, or create one if needed
					foundTextPart := false
					for _, part := range resp.Candidates[0].Content.Parts {
						if part.Text != "" {
							part.Text = fullText
							foundTextPart = true
							break
						}
					}
					// If no text part exists, create one with the full text
					if !foundTextPart && fullText != "" {
						resp.Candidates[0].Content.Parts = append([]*genai.Part{
							{Text: fullText},
						}, resp.Candidates[0].Content.Parts...)
					}
				}
			}
		}
	} else {
		// Non-streaming path
		var err error
		resp, err = v.client.Models.GenerateContent(ctx, v.modelID, contents, genConfig)
		if err != nil {
			return nil, fmt.Errorf("gemini GenerateContent: %w", err)
		}
	}

	if resp == nil || len(resp.Candidates) == 0 {
		// Check if response was blocked
		if resp != nil && resp.PromptFeedback != nil {
			if resp.PromptFeedback.BlockReason != "" {
				return nil, fmt.Errorf("gemini blocked prompt: %s (reason: %s)",
					resp.PromptFeedback.BlockReasonMessage, resp.PromptFeedback.BlockReason)
			}
		}
		return nil, fmt.Errorf("gemini returned no candidates")
	}

	// Parse response
	gr := &GeminiResponse{
		RawResponse: resp,
	}

	cand := resp.Candidates[0]

	// Check if response was blocked by safety filters
	if cand.FinishReason != "" && cand.FinishReason != "STOP" && cand.FinishReason != "MAX_TOKENS" {
		// Log safety ratings for debugging
		if len(cand.SafetyRatings) > 0 {
			for _, rating := range cand.SafetyRatings {
				if rating.Blocked {
					fmt.Printf("[gemini] Response blocked by safety filter: category=%s, probability=%s\n",
						rating.Category, rating.Probability)
				}
			}
		}
		return nil, fmt.Errorf("gemini response blocked: finish_reason=%s", cand.FinishReason)
	}

	if cand.Content == nil {
		// Check why content is nil
		fmt.Printf("[gemini] Warning: candidate content is nil, finish_reason=%s\n", cand.FinishReason)
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
func (v *GenaiGeminiClient) ChatWithTools(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext) (*GeminiResponse, error) {
	const maxIterations = 5 // reduced to limit token consumption per message

	workingMessages := make([]Message, 0, len(messages)+6)
	workingMessages = append(workingMessages, messages...)

	var lastResp *GeminiResponse

	// Accumulate token usage across all iterations
	var totalPromptTokens, totalCandidatesTokens int32

	for iter := 0; iter < maxIterations; iter++ {
		gr, err := v.callGeminiWithMessages(ctx, systemMessage, workingMessages, streamCtx)
		if err != nil {
			return nil, fmt.Errorf("callGeminiWithMessages: %w", err)
		}
		lastResp = gr

		// Accumulate token usage from this iteration
		if gr.RawResponse != nil && gr.RawResponse.UsageMetadata != nil {
			totalPromptTokens += gr.RawResponse.UsageMetadata.PromptTokenCount
			totalCandidatesTokens += gr.RawResponse.UsageMetadata.CandidatesTokenCount
			fmt.Printf("[gemini] Iteration %d token usage: prompt=%d, candidates=%d (cumulative: prompt=%d, candidates=%d)\n",
				iter+1, gr.RawResponse.UsageMetadata.PromptTokenCount, gr.RawResponse.UsageMetadata.CandidatesTokenCount,
				totalPromptTokens, totalCandidatesTokens)
		}

		// If no function calls, we're done
		if len(gr.FunctionCalls) == 0 {
			// Store cumulative usage in the final response
			if gr.RawResponse != nil && gr.RawResponse.UsageMetadata != nil {
				gr.RawResponse.UsageMetadata.PromptTokenCount = totalPromptTokens
				gr.RawResponse.UsageMetadata.CandidatesTokenCount = totalCandidatesTokens
				fmt.Printf("[gemini] Final cumulative usage: prompt=%d, candidates=%d, total=%d\n",
					totalPromptTokens, totalCandidatesTokens, totalPromptTokens+totalCandidatesTokens)
			}
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
		execResults := ExecuteTools(ctx, toolCalls, streamCtx)

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

	// Max iterations reached - tools were executed but Gemini didn't finish responding.
	// Instead of failing, make one final call WITHOUT tools for a text summary.
	fmt.Printf("[gemini] Max iterations (%d) reached. Making final call for text response.\n", maxIterations)

	// Add a user message asking for a summary of what was done
	workingMessages = append(workingMessages, Message{
		Role:    "user",
		Content: "You have reached the maximum number of tool iterations. Please provide a summary of what you have accomplished so far and what remains to be done (if anything). Do not attempt to call any more tools.",
	})

	// Temporarily disable tools for final call
	originalTools := v.Tools
	v.Tools = nil
	finalResp, err := v.callGeminiWithMessages(ctx, systemMessage, workingMessages, streamCtx)
	v.Tools = originalTools

	if err != nil {
		fmt.Printf("[gemini] Warning: final summary call failed: %v. Returning last response.\n", err)
		// Update lastResp with cumulative usage before returning
		if lastResp != nil && lastResp.RawResponse != nil && lastResp.RawResponse.UsageMetadata != nil {
			lastResp.RawResponse.UsageMetadata.PromptTokenCount = totalPromptTokens
			lastResp.RawResponse.UsageMetadata.CandidatesTokenCount = totalCandidatesTokens
		}
		return lastResp, nil
	}

	// Accumulate tokens from the final call
	if finalResp.RawResponse != nil && finalResp.RawResponse.UsageMetadata != nil {
		totalPromptTokens += finalResp.RawResponse.UsageMetadata.PromptTokenCount
		totalCandidatesTokens += finalResp.RawResponse.UsageMetadata.CandidatesTokenCount
	}

	// Store cumulative usage in the final response
	if finalResp.RawResponse != nil && finalResp.RawResponse.UsageMetadata != nil {
		finalResp.RawResponse.UsageMetadata.PromptTokenCount = totalPromptTokens
		finalResp.RawResponse.UsageMetadata.CandidatesTokenCount = totalCandidatesTokens
		fmt.Printf("[gemini] Final cumulative usage (with summary): prompt=%d, candidates=%d, total=%d\n",
			totalPromptTokens, totalCandidatesTokens, totalPromptTokens+totalCandidatesTokens)
	}

	// Fallback: if final response has no text content, return lastResp or default message
	if len(finalResp.TextContent) == 0 || (len(finalResp.TextContent) == 1 && strings.TrimSpace(finalResp.TextContent[0]) == "") {
		fmt.Printf("[gemini] Final response has no text content. Returning last response.\n")
		if lastResp != nil && len(lastResp.TextContent) > 0 {
			// Update lastResp with cumulative usage before returning
			if lastResp.RawResponse != nil && lastResp.RawResponse.UsageMetadata != nil {
				lastResp.RawResponse.UsageMetadata.PromptTokenCount = totalPromptTokens
				lastResp.RawResponse.UsageMetadata.CandidatesTokenCount = totalCandidatesTokens
			}
			return lastResp, nil
		}
		// If lastResp also has no text, add a default message
		finalResp.TextContent = []string{"I completed several operations but reached the maximum iteration limit. Please check the board for the results."}
	}

	return finalResp, nil
}

func (v *GenaiGeminiClient) Chat(ctx context.Context, systemMessage string, messages []Message) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	resp, err := v.ChatWithTools(ctx, systemMessage, messages, nil)
	if err != nil {
		return "", err
	}

	if len(resp.TextContent) == 0 {
		return "", fmt.Errorf("gemini returned no text content")
	}

	return strings.Join(resp.TextContent, "\n\n"), nil
}

func (v *GenaiGeminiClient) ChatStream(ctx context.Context, hub *libraries.Hub, client *libraries.Client, boardId string, systemMessage string, messages []Message) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	var streamCtx *StreamingContext
	if client != nil {
		streamCtx = &StreamingContext{
			Hub:     hub,
			Client:  client,
			BoardId: boardId, // Can be empty string
			UserID:  client.UserID,
		}
	}
	resp, err := v.ChatWithTools(ctx, systemMessage, messages, streamCtx)
	if err != nil {
		return "", err
	}

	if len(resp.TextContent) == 0 {
		return "", fmt.Errorf("gemini returned no text content")
	}

	return strings.Join(resp.TextContent, "\n\n"), nil
}

func (v *GenaiGeminiClient) ChatStreamWithUsage(ctx context.Context, hub *libraries.Hub, client *libraries.Client, boardId string, systemMessage string, messages []Message) (*ResponseWithUsage, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	var streamCtx *StreamingContext
	var inputText string
	if client != nil {
		streamCtx = &StreamingContext{
			Hub:     hub,
			Client:  client,
			BoardId: boardId,
			UserID:  client.UserID,
		}
	}

	// Capture the last user message as input for token counting
	for _, m := range messages {
		if m.Role == models.RoleUser {
			if text, ok := m.Content.(string); ok {
				inputText = text
			}
		}
	}

	resp, err := v.ChatWithTools(ctx, systemMessage, messages, streamCtx)
	if err != nil {
		return nil, err
	}

	if len(resp.TextContent) == 0 {
		// Try to get more info about why there's no content
		if resp.RawResponse != nil && len(resp.RawResponse.Candidates) > 0 {
			cand := resp.RawResponse.Candidates[0]
			fmt.Printf("[gemini] No text content - finish_reason=%s, content_nil=%v\n",
				cand.FinishReason, cand.Content == nil)
			if len(cand.SafetyRatings) > 0 {
				for _, rating := range cand.SafetyRatings {
					fmt.Printf("[gemini] Safety rating: category=%s, probability=%s, blocked=%v\n",
						rating.Category, rating.Probability, rating.Blocked)
				}
			}
		}
		return nil, fmt.Errorf("gemini returned no text content - the response may have been blocked by safety filters")
	}

	// Extract token usage from response
	tokenUsage := ExtractGeminiUsage(resp, inputText)

	return &ResponseWithUsage{
		Text:       strings.Join(resp.TextContent, "\n\n"),
		TokenUsage: tokenUsage,
	}, nil
}

/*
Current Config (line 253-257):

  genConfig := &genai.GenerateContentConfig{
      Temperature:     &v.Temperature,
      MaxOutputTokens: v.MaxTokens,
      Tools:           genaiTools,
      // NO ThinkingConfig
  }

  To Add Thinking, you'd add:

  genConfig := &genai.GenerateContentConfig{
      Temperature:     &v.Temperature,
      MaxOutputTokens: v.MaxTokens,
      Tools:           genaiTools,
      ThinkingConfig: &genai.ThinkingConfig{
          IncludeThoughts: true,
          ThinkingLevel:   genai.ThinkingLevelHigh,  // "LOW" or "HIGH"
          // OR
          ThinkingBudget:  &budgetTokens,            // custom token budget
      },
  }

  Available Options:
  ┌─────────────────┬────────┬───────────────┐
  │      Field      │  Type  │    Values     │
  ├─────────────────┼────────┼───────────────┤
  │ IncludeThoughts │ bool   │ true/false    │
  ├─────────────────┼────────┼───────────────┤
  │ ThinkingLevel   │ string │ "LOW", "HIGH" │
  ├─────────────────┼────────┼───────────────┤
  │ ThinkingBudget  │ *int32 │ token count   │
  └─────────────────┴────────┴───────────────┘
*/
