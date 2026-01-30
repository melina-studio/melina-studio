package llmHandlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/models"
	"net/http"
	"os"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// ClaudeResponse contains the parsed response from Claude
type ClaudeResponse struct {
	StopReason  string
	TextContent []string
	ToolUses    []ToolUse
	RawResponse interface{} // Can hold either HTTP response or gRPC response
}

// ToolUse represents a tool call from Claude
type ToolUse struct {
	ID    string
	Name  string
	Input map[string]interface{}
}

// Message represents a message in the conversation
type Content struct {
	Type  string
	Text  string
	Image struct {
		MimeType string
		Data     []byte
	}
}

type Message struct {
	Role    models.Role
	Content interface{} // can be string or []map[string]interface{}
}

type streamEvent struct {
	Type         string                 `json:"type"` // e.g. "message_start", "content_block_delta", "message_stop", etc.
	Content      []streamContentBlock   `json:"content,omitempty"`
	Delta        *streamDelta           `json:"delta,omitempty"`         // for content_block_delta
	StopReason   string                 `json:"stop_reason,omitempty"`   // for message_stop
	ContentBlock *streamContentBlockRef `json:"content_block,omitempty"` // for content_block_start
	Index        int                    `json:"index,omitempty"`         // block index for content_block_delta
	Message      *streamMessage         `json:"message,omitempty"`       // for message_start
	Usage        *streamUsage           `json:"usage,omitempty"`         // for message_delta with usage
}

type streamMessage struct {
	ID           string        `json:"id"`
	Type         string        `json:"type"`
	Role         string        `json:"role"`
	Content      []interface{} `json:"content"`
	Model        string        `json:"model"`
	StopReason   string        `json:"stop_reason,omitempty"`
	StopSequence string        `json:"stop_sequence,omitempty"`
	Usage        *streamUsage  `json:"usage,omitempty"`
}

type streamUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type streamContentBlock struct {
	Type      string                 `json:"type"`                  // "text", "tool_use", etc.
	Text      string                 `json:"text"`                  // for text blocks
	ID        string                 `json:"id"`                    // for tool_use blocks
	Name      string                 `json:"name"`                  // for tool_use blocks
	Input     map[string]interface{} `json:"input"`                 // for tool_use blocks (can be partial during streaming)
	Index     int                    `json:"index"`                 // block index
	ToolUseID string                 `json:"tool_use_id,omitempty"` // for tool_result blocks
}

type streamDelta struct {
	Type        string `json:"type"`         // "text_delta", "input_json_delta", etc.
	Text        string `json:"text"`         // for text_delta
	Delta       string `json:"delta"`        // for input_json_delta (partial JSON) - some APIs use this
	PartialJSON string `json:"partial_json"` // for input_json_delta (partial JSON) - Vertex AI uses this
	Thinking    string `json:"thinking"`     // for thinking blocks
}

type streamContentBlockRef struct {
	Type  string `json:"type"`
	Index int    `json:"index"`
	ID    string `json:"id,omitempty"`   // for tool_use blocks
	Name  string `json:"name,omitempty"` // for tool_use blocks
}

func callClaudeWithMessages(ctx context.Context, systemMessage string, messages []Message, tools []map[string]interface{}, temperature *float32, maxTokens *int, modelIDOverride string, enableThinking bool) (*ClaudeResponse, error) {
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT_ID")
	location := os.Getenv("GOOGLE_CLOUD_VERTEXAI_LOCATION") // "us-east5"
	modelID := modelIDOverride
	if modelID == "" {
		modelID = os.Getenv("CLAUDE_VERTEX_MODEL") // fallback to env var
	}
	if modelID == "" {
		modelID = "claude-sonnet-4-5@20250929" // final fallback
	}

	// -------- 1) Build authed HTTP client from SA JSON --------
	enc := os.Getenv("GCP_SERVICE_ACCOUNT_CREDENTIALS")
	if enc == "" {
		return nil, fmt.Errorf("GCP_SERVICE_ACCOUNT_CREDENTIALS not set")
	}
	saJSON, err := base64.StdEncoding.DecodeString(enc)
	if err != nil {
		return nil, fmt.Errorf("decode sa json: %w", err)
	}

	creds, err := google.CredentialsFromJSON(ctx, saJSON, "https://www.googleapis.com/auth/cloud-platform")
	if err != nil {
		return nil, fmt.Errorf("CredentialsFromJSON: %w", err)
	}
	httpClient := oauth2.NewClient(ctx, creds.TokenSource)

	// -------- 2) Build Vertex URL --------
	url := fmt.Sprintf(
		"https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/anthropic/models/%s:rawPredict",
		location, projectID, location, modelID,
	)

	// -------- 3) Build request body --------
	// messages -> []map[string]interface{} in Claude format
	msgs := make([]map[string]interface{}, len(messages))
	for i, m := range messages {
		msgs[i] = map[string]interface{}{
			"role":    m.Role,
			"content": m.Content, // string is fine for simple text, or array for content blocks
		}
	}

	body := map[string]interface{}{
		"anthropic_version": "vertex-2023-10-16",
		"messages":          msgs,
		"stream":            false,
	}

	maxTokensValue := 1024 // default
	if maxTokens != nil {
		maxTokensValue = *maxTokens
	}
	body["max_tokens"] = maxTokensValue

	if temperature != nil {
		body["temperature"] = *temperature
	}

	if systemMessage != "" {
		// Use cache_control for system prompt caching (Vertex AI format)
		body["system"] = []map[string]interface{}{
			{
				"type": "text",
				"text": systemMessage,
				"cache_control": map[string]string{
					"type": "ephemeral",
				},
			},
		}
	}

	if enableThinking {
		thinkingBudget := 1024
		body["thinking"] = map[string]interface{}{
			"type":          "enabled",
			"budget_tokens": thinkingBudget,
		}
		body["temperature"] = 1 // for thinking temperature must be 1 always

		// max_tokens MUST be greater than thinking.budget_tokens
		// Ensure max_tokens is at least budget_tokens + 1024 for response content
		if maxTokensValue <= thinkingBudget {
			body["max_tokens"] = thinkingBudget + 1024
		}
	}

	if len(tools) > 0 {
		body["tools"] = tools
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// -------- 4) Send request --------
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		buf := new(bytes.Buffer)
		_, _ = buf.ReadFrom(resp.Body)
		return nil, fmt.Errorf("vertex error %d: %s", resp.StatusCode, buf.String())
	}

	// -------- 5) Decode response into your ClaudeResponse --------
	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	cr := &ClaudeResponse{
		RawResponse: raw, // you’ll need to change type from *aiplatformpb.PredictResponse to interface{} or json.RawMessage
	}

	// raw["content"] is []{type,text,...}
	if contentAny, ok := raw["content"]; ok {
		if blocks, ok := contentAny.([]interface{}); ok {
			for _, b := range blocks {
				block, _ := b.(map[string]interface{})
				switch block["type"] {
				case "text":
					if t, ok := block["text"].(string); ok {
						cr.TextContent = append(cr.TextContent, t)
					}
				case "tool_use":
					id, _ := block["id"].(string)
					name, _ := block["name"].(string)
					input, _ := block["input"].(map[string]interface{})
					cr.ToolUses = append(cr.ToolUses, ToolUse{
						ID:    id,
						Name:  name,
						Input: input,
					})
				}
			}
		}
	}

	return cr, nil
}

// StreamClaudeWithMessages streams Claude output and calls onTextChunk for each text delta.
func StreamClaudeWithMessages(
	ctx context.Context,
	systemMessage string,
	messages []Message,
	tools []map[string]interface{},
	streamCtx *StreamingContext,
	temperature *float32,
	maxTokens *int,
	modelIDOverride string,
	enableThinking bool,
) (*ClaudeResponse, error) {
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT_ID")
	location := os.Getenv("GOOGLE_CLOUD_VERTEXAI_LOCATION") // e.g. "us-east5"
	modelID := modelIDOverride
	if modelID == "" {
		modelID = os.Getenv("CLAUDE_VERTEX_MODEL") // fallback to env var
	}
	if modelID == "" {
		modelID = "claude-sonnet-4-5@20250929" // final fallback
	}

	// ---------- 1) Auth HTTP client from SA JSON ----------
	enc := os.Getenv("GCP_SERVICE_ACCOUNT_CREDENTIALS")
	if enc == "" {
		return nil, fmt.Errorf("GCP_SERVICE_ACCOUNT_CREDENTIALS not set")
	}
	saJSON, err := base64.StdEncoding.DecodeString(enc)
	if err != nil {
		return nil, fmt.Errorf("decode sa json: %w", err)
	}

	creds, err := google.CredentialsFromJSON(ctx, saJSON, "https://www.googleapis.com/auth/cloud-platform")
	if err != nil {
		return nil, fmt.Errorf("CredentialsFromJSON: %w", err)
	}
	httpClient := oauth2.NewClient(ctx, creds.TokenSource)

	// ---------- 2) Build streamRawPredict URL ----------
	url := fmt.Sprintf(
		"https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/anthropic/models/%s:streamRawPredict",
		location, projectID, location, modelID,
	)

	// ---------- 3) Build request body ----------
	msgs := make([]map[string]interface{}, len(messages))
	for i, m := range messages {
		msgs[i] = map[string]interface{}{
			"role":    m.Role,
			"content": m.Content,
		}
	}

	body := map[string]interface{}{
		"anthropic_version": "vertex-2023-10-16",
		"messages":          msgs,
		"stream":            true, // streaming flag
	}

	maxTokensValue := 1024 // default
	if maxTokens != nil {
		maxTokensValue = *maxTokens
	}

	body["max_tokens"] = maxTokensValue

	if temperature != nil {
		body["temperature"] = *temperature
	}

	if systemMessage != "" {
		// Use cache_control for system prompt caching (Vertex AI format)
		body["system"] = []map[string]interface{}{
			{
				"type": "text",
				"text": systemMessage,
				"cache_control": map[string]string{
					"type": "ephemeral",
				},
			},
		}
	}

	if enableThinking {
		thinkingBudget := 1024
		body["thinking"] = map[string]interface{}{
			"type":          "enabled",
			"budget_tokens": thinkingBudget,
		}
		body["temperature"] = 1 // for thinking temperature must be 1 always

		// max_tokens MUST be greater than thinking.budget_tokens
		// Ensure max_tokens is at least budget_tokens + 1024 for response content
		if maxTokensValue <= thinkingBudget {
			body["max_tokens"] = thinkingBudget + 1024
		}
	}

	if len(tools) > 0 {
		body["tools"] = tools
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	// ---------- 4) Do request & read SSE ----------
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		buf := new(bytes.Buffer)
		_, _ = buf.ReadFrom(resp.Body)
		return nil, fmt.Errorf("vertex error %d: %s", resp.StatusCode, buf.String())
	}

	// Initialize response to accumulate data
	cr := &ClaudeResponse{
		TextContent: []string{},
		ToolUses:    []ToolUse{},
		RawResponse: make(map[string]interface{}), // Initialize to store usage data
	}

	// Track current text block being built
	var currentTextBuilder strings.Builder
	var accumulatedText strings.Builder
	var currentThinkingBuilder strings.Builder

	// Track current tool_use block being built (by index)
	// Map of block index -> ToolUse being built
	currentToolUseBuilders := make(map[int]*ToolUse)
	currentToolUseInputBuilders := make(map[int]*strings.Builder) // for accumulating JSON input

	// Track usage data
	var usageData *streamUsage

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()

		// SSE lines look like: "data: { ... }"
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")

		// Vertex typically uses [DONE] or similar sentinel when finished
		if data == "[DONE]" || data == "" {
			break
		}

		var ev streamEvent
		if err := json.Unmarshal([]byte(data), &ev); err != nil {
			// Don't hard-fail on a single malformed chunk; you can log instead
			continue
		}

		// Debug: Log tool_use related events (can be removed later)
		if ev.Type == "content_block_start" && ev.ContentBlock != nil && ev.ContentBlock.Type == "tool_use" {
			fmt.Printf("[anthropic] Started tool_use: index=%d, ID=%s, Name=%s\n", ev.ContentBlock.Index, ev.ContentBlock.ID, ev.ContentBlock.Name)
		}

		switch ev.Type {
		case "content_block_delta":
			// Handle incremental text or tool_use input updates
			if ev.Delta != nil {
				if ev.Delta.Type == "text_delta" && ev.Delta.Text != "" {
					// Accumulate text delta
					currentTextBuilder.WriteString(ev.Delta.Text)
					accumulatedText.WriteString(ev.Delta.Text)

					// Send streaming chunk to client
					if streamCtx != nil && streamCtx.Client != nil {
						payload := &libraries.ChatMessageResponsePayload{
							Message: ev.Delta.Text,
						}
						if streamCtx.BoardId != "" {
							payload.BoardId = streamCtx.BoardId
						}
						libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
					}
				} else if ev.Delta.Type == "input_json_delta" {
					// Tool use input is being streamed (partial JSON)
					// Vertex AI uses "partial_json" field, other APIs might use "delta"
					jsonChunk := ev.Delta.PartialJSON
					if jsonChunk == "" {
						jsonChunk = ev.Delta.Delta
					}

					if jsonChunk != "" {
						// Use the index from the event to find the correct tool_use builder
						idx := ev.Index
						if inputBuilder, ok := currentToolUseInputBuilders[idx]; ok {
							inputBuilder.WriteString(jsonChunk)
							fmt.Printf("[anthropic] Accumulated partial_json for index %d: %s (total: %d chars)\n", idx, jsonChunk, inputBuilder.Len())
						} else {
							// Index not found - try to find any active builder
							// This handles cases where index might not be set correctly
							if len(currentToolUseInputBuilders) > 0 {
								// Use the most recent one (highest index)
								var maxIndex int = -1
								for idx := range currentToolUseInputBuilders {
									if idx > maxIndex {
										maxIndex = idx
									}
								}
								if maxIndex >= 0 {
									currentToolUseInputBuilders[maxIndex].WriteString(jsonChunk)
									fmt.Printf("[anthropic] Accumulated partial_json to fallback index %d\n", maxIndex)
								}
							} else {
								// No builder exists yet - this shouldn't happen, but log it
								fmt.Printf("[anthropic] WARNING: input_json_delta received but no tool_use builder exists (index: %d, chunk: %s)\n", idx, jsonChunk)
							}
						}
					}
				} else if ev.Delta.Type == "thinking_delta" && ev.Delta.Thinking != "" {
					currentThinkingBuilder.WriteString(ev.Delta.Thinking)
					// Stream thinking to client (reuse chat_response or create a new type)
					if streamCtx != nil && streamCtx.Client != nil {
						payload := &libraries.ChatMessageResponsePayload{
							Message: ev.Delta.Thinking,
						}
						if streamCtx.BoardId != "" {
							payload.BoardId = streamCtx.BoardId
						}
						libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingResponse, payload)
					}
				}
			}

		case "content_block_stop":
			// A content block (text or tool_use) is complete
			// If it was a text block, finalize it
			if currentTextBuilder.Len() > 0 {
				text := currentTextBuilder.String()
				cr.TextContent = append(cr.TextContent, text)
				currentTextBuilder.Reset()
			}
			// Finalize tool_use block - check if we have an index in the event
			// The index might be in ev.Index or we need to finalize all pending
			var indicesToFinalize []int
			// Check if index is explicitly provided and exists in our builders
			// Note: 0 is a valid index, so we check if it exists in the map
			if _, hasIndex := currentToolUseBuilders[ev.Index]; hasIndex {
				// Specific index provided and exists
				indicesToFinalize = []int{ev.Index}
			} else if len(currentToolUseBuilders) > 0 {
				// No valid index specified - finalize all pending tool_use blocks
				for idx := range currentToolUseBuilders {
					indicesToFinalize = append(indicesToFinalize, idx)
				}
			}

			for _, idx := range indicesToFinalize {
				if toolUse, ok := currentToolUseBuilders[idx]; ok {
					// Try to get input from accumulated JSON deltas
					if inputBuilder, ok := currentToolUseInputBuilders[idx]; ok && inputBuilder.Len() > 0 {
						// Parse the accumulated JSON input
						accumulatedJSON := inputBuilder.String()
						var input map[string]interface{}
						if err := json.Unmarshal([]byte(accumulatedJSON), &input); err == nil {
							toolUse.Input = input
						} else {
							// Log parsing error for debugging
							fmt.Printf("[anthropic] Failed to parse tool_use input JSON for index %d: %v, JSON: %s\n", idx, err, accumulatedJSON)
						}
					} else {
						// No input was accumulated - log for debugging
						fmt.Printf("[anthropic] No input accumulated for tool_use index %d (ID: %s, Name: %s)\n", idx, toolUse.ID, toolUse.Name)
					}
					// Add to response (only if we have ID and Name)
					if toolUse.ID != "" && toolUse.Name != "" {
						cr.ToolUses = append(cr.ToolUses, *toolUse)
						fmt.Printf("[anthropic] Finalized tool_use: ID=%s, Name=%s, Input=%v\n", toolUse.ID, toolUse.Name, toolUse.Input)
					}
					// Clean up
					delete(currentToolUseBuilders, idx)
					delete(currentToolUseInputBuilders, idx)
				}
			}

			// Finalize thinking block if active
			if currentThinkingBuilder.Len() > 0 {
				// Optionally store thinking content somewhere
				currentThinkingBuilder.Reset()
				// Send thinking_completed event
				if streamCtx != nil && streamCtx.Client != nil {
					libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingCompleted)
				}
			}

		case "content_block_start":
			// A new content block is starting
			if ev.ContentBlock != nil {
				if ev.ContentBlock.Type == "tool_use" {
					// Initialize a new tool use (will be populated in subsequent deltas)
					idx := ev.ContentBlock.Index
					currentToolUseBuilders[idx] = &ToolUse{
						ID:    ev.ContentBlock.ID,   // Extract ID if available
						Name:  ev.ContentBlock.Name, // Extract name if available
						Input: make(map[string]interface{}),
					}
					currentToolUseInputBuilders[idx] = &strings.Builder{}
					fmt.Printf("[anthropic] Started tool_use block: index=%d, ID=%s, Name=%s\n", idx, ev.ContentBlock.ID, ev.ContentBlock.Name)
				} else if ev.ContentBlock.Type == "text" {
					// Reset text builder for new text block
					currentTextBuilder.Reset()
				} else if ev.ContentBlock.Type == "thinking" {
					// Reset thinking builder for new thinking block
					currentThinkingBuilder.Reset()
					// Send thinking_start event
					if streamCtx != nil && streamCtx.Client != nil {
						libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingStart)
					}
				}
			}

		case "message_stop":
			// Message is complete - extract stop_reason and finalize any pending tool uses
			if ev.StopReason != "" {
				cr.StopReason = ev.StopReason
			}

			// Finalize any pending tool_use blocks that didn't get a content_block_stop
			for idx, toolUse := range currentToolUseBuilders {
				if toolUse.ID != "" && toolUse.Name != "" {
					// Try to get input from accumulated JSON deltas
					if inputBuilder, ok := currentToolUseInputBuilders[idx]; ok && inputBuilder.Len() > 0 {
						accumulatedJSON := inputBuilder.String()
						var input map[string]interface{}
						if err := json.Unmarshal([]byte(accumulatedJSON), &input); err == nil {
							toolUse.Input = input
						} else {
							fmt.Printf("[anthropic] message_stop: Failed to parse tool_use input JSON for index %d: %v\n", idx, err)
						}
					}

					// Check if this tool_use is already in the response (avoid duplicates)
					alreadyAdded := false
					for _, existing := range cr.ToolUses {
						if existing.ID == toolUse.ID {
							alreadyAdded = true
							break
						}
					}

					if !alreadyAdded {
						cr.ToolUses = append(cr.ToolUses, *toolUse)
						fmt.Printf("[anthropic] message_stop: Finalized pending tool_use: ID=%s, Name=%s, Input=%v\n", toolUse.ID, toolUse.Name, toolUse.Input)
					}
				}
			}
			// Clear the builders
			currentToolUseBuilders = make(map[int]*ToolUse)
			currentToolUseInputBuilders = make(map[int]*strings.Builder)

		case "message_start":
			// Capture initial usage data from message_start event
			if ev.Message != nil && ev.Message.Usage != nil {
				if usageData == nil {
					usageData = &streamUsage{}
				}
				// message_start typically has input tokens
				if ev.Message.Usage.InputTokens > 0 {
					usageData.InputTokens = ev.Message.Usage.InputTokens
				}
				if ev.Message.Usage.OutputTokens > 0 {
					usageData.OutputTokens = ev.Message.Usage.OutputTokens
				}
				fmt.Printf("[anthropic] message_start usage: input=%d, output=%d\n", usageData.InputTokens, usageData.OutputTokens)
			}

		case "message_delta":
			// Message-level delta (usually contains stop_reason and updated usage)
			if ev.StopReason != "" {
				cr.StopReason = ev.StopReason
			}
			// Merge usage data if provided (message_delta typically has output tokens)
			if ev.Usage != nil {
				if usageData == nil {
					usageData = &streamUsage{}
				}
				// Keep input tokens from message_start, update output tokens from delta
				if ev.Usage.InputTokens > 0 {
					usageData.InputTokens = ev.Usage.InputTokens
				}
				if ev.Usage.OutputTokens > 0 {
					usageData.OutputTokens = ev.Usage.OutputTokens
				}
				fmt.Printf("[anthropic] message_delta usage: input=%d, output=%d (merged)\n", usageData.InputTokens, usageData.OutputTokens)
			}

		case "content_block":
			// Full content block (used in some streaming formats)
			for _, block := range ev.Content {
				if block.Type == "text" && block.Text != "" {
					// Complete text block
					cr.TextContent = append(cr.TextContent, block.Text)
					accumulatedText.WriteString(block.Text)

					// Send to client
					if streamCtx != nil && streamCtx.Client != nil {
						payload := &libraries.ChatMessageResponsePayload{
							Message: block.Text,
						}
						if streamCtx.BoardId != "" {
							payload.BoardId = streamCtx.BoardId
						}
						libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
					}
				} else if block.Type == "tool_use" {
					// Complete tool use block - this might contain the full input
					toolUse := ToolUse{
						ID:    block.ID,
						Name:  block.Name,
						Input: block.Input,
					}

					// If input is provided directly in the block, use it
					// Otherwise, check if we have accumulated input from deltas
					if len(toolUse.Input) == 0 {
						// Try to get from accumulated input if available
						if block.Index >= 0 {
							if inputBuilder, ok := currentToolUseInputBuilders[block.Index]; ok && inputBuilder.Len() > 0 {
								var input map[string]interface{}
								if err := json.Unmarshal([]byte(inputBuilder.String()), &input); err == nil {
									toolUse.Input = input
								}
							}
						}
					}

					cr.ToolUses = append(cr.ToolUses, toolUse)
					fmt.Printf("[anthropic] Found tool_use in content_block: ID=%s, Name=%s, Input=%v\n", toolUse.ID, toolUse.Name, toolUse.Input)

					// Also update any in-progress builder for this index
					if block.Index >= 0 {
						if existingToolUse, ok := currentToolUseBuilders[block.Index]; ok {
							existingToolUse.ID = block.ID
							existingToolUse.Name = block.Name
							if len(block.Input) > 0 {
								existingToolUse.Input = block.Input
							} else if inputBuilder, ok := currentToolUseInputBuilders[block.Index]; ok && inputBuilder.Len() > 0 {
								// Try accumulated input
								var input map[string]interface{}
								if err := json.Unmarshal([]byte(inputBuilder.String()), &input); err == nil {
									existingToolUse.Input = input
								}
							}
						}
					}
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scanner error: %w", err)
	}

	// Finalize any remaining text
	if currentTextBuilder.Len() > 0 {
		text := currentTextBuilder.String()
		cr.TextContent = append(cr.TextContent, text)
	}

	// Finalize any remaining tool_use blocks
	for idx, toolUse := range currentToolUseBuilders {
		if inputBuilder, ok := currentToolUseInputBuilders[idx]; ok && inputBuilder.Len() > 0 {
			// Parse the accumulated JSON input
			var input map[string]interface{}
			if err := json.Unmarshal([]byte(inputBuilder.String()), &input); err == nil {
				toolUse.Input = input
			}
		}
		// Add to response (only if we have ID and Name)
		if toolUse.ID != "" && toolUse.Name != "" {
			cr.ToolUses = append(cr.ToolUses, *toolUse)
		}
		// Clean up
		delete(currentToolUseBuilders, idx)
		delete(currentToolUseInputBuilders, idx)
	}

	// If we have accumulated text but no TextContent entries, create one
	if accumulatedText.Len() > 0 && len(cr.TextContent) == 0 {
		cr.TextContent = append(cr.TextContent, accumulatedText.String())
	}

	// Store usage data in RawResponse for token extraction
	if usageData != nil {
		if rawMap, ok := cr.RawResponse.(map[string]interface{}); ok {
			rawMap["usage"] = map[string]interface{}{
				"input_tokens":  usageData.InputTokens,
				"output_tokens": usageData.OutputTokens,
			}
			fmt.Printf("[anthropic] Stored usage in RawResponse: input=%d, output=%d\n", usageData.InputTokens, usageData.OutputTokens)
		}
	}

	return cr, nil
}

// === Updated ExecuteToolFlow that uses dynamic dispatcher ===
func ChatWithTools(ctx context.Context, systemMessage string, messages []Message, tools []map[string]interface{}, streamCtx *StreamingContext, temperature *float32, maxTokens *int, modelID string, enableThinking bool) (*ClaudeResponse, error) {
	const maxIterations = 5 // safety guard - reduced to limit token consumption per message

	workingMessages := make([]Message, 0, len(messages)+6)
	workingMessages = append(workingMessages, messages...)

	var lastResp *ClaudeResponse

	// Accumulate token usage across all iterations
	var totalInputTokens, totalOutputTokens int

	for iter := 0; iter < maxIterations; iter++ {

		var cr *ClaudeResponse
		var err error
		if streamCtx != nil && streamCtx.Client != nil {
			cr, err = StreamClaudeWithMessages(ctx, systemMessage, workingMessages, tools, streamCtx, temperature, maxTokens, modelID, enableThinking)
			if err != nil {
				return nil, fmt.Errorf("StreamClaudeWithMessages: %w", err)
			}
		} else {
			cr, err = callClaudeWithMessages(ctx, systemMessage, workingMessages, tools, temperature, maxTokens, modelID, enableThinking)
			if err != nil {
				return nil, fmt.Errorf("callClaudeWithMessages: %w", err)
			}
		}

		if cr == nil {
			return nil, fmt.Errorf("received nil response from Claude")
		}

		lastResp = cr

		// Accumulate token usage from this iteration
		if raw, ok := cr.RawResponse.(map[string]interface{}); ok {
			if usage, ok := raw["usage"].(map[string]interface{}); ok {
				if inputTokens, ok := usage["input_tokens"].(int); ok {
					totalInputTokens += inputTokens
				}
				if outputTokens, ok := usage["output_tokens"].(int); ok {
					totalOutputTokens += outputTokens
				}
			}
		}
		fmt.Printf("[anthropic] Iteration %d token usage: input=%d, output=%d (cumulative: input=%d, output=%d)\n",
			iter+1, totalInputTokens, totalOutputTokens, totalInputTokens, totalOutputTokens)

		// If no tool uses, we're done
		if len(cr.ToolUses) == 0 {
			// Store cumulative usage in the final response
			if rawMap, ok := cr.RawResponse.(map[string]interface{}); ok {
				rawMap["usage"] = map[string]interface{}{
					"input_tokens":  totalInputTokens,
					"output_tokens": totalOutputTokens,
				}
				fmt.Printf("[anthropic] Final cumulative usage: input=%d, output=%d, total=%d\n",
					totalInputTokens, totalOutputTokens, totalInputTokens+totalOutputTokens)
			}
			return cr, nil
		}

		// Convert ToolUses to common ToolCall format
		// Note: We must include ALL tool calls (even empty ones) because Claude requires
		// a tool_result for every tool_use in the assistant message
		toolCalls := make([]ToolCall, 0, len(cr.ToolUses))
		for _, toolUse := range cr.ToolUses {
			toolCalls = append(toolCalls, ToolCall{
				ID:       toolUse.ID,
				Name:     toolUse.Name,
				Input:    toolUse.Input,
				Provider: "anthropic",
			})
		}

		// Execute tools using common executor
		execResults := ExecuteTools(ctx, toolCalls, streamCtx)

		// Count successes and failures for logging
		successCount := 0
		failureCount := 0
		for _, r := range execResults {
			if r.Error != nil {
				failureCount++
			} else {
				successCount++
			}
		}
		if len(execResults) > 0 {
			fmt.Printf("[anthropic] Tool execution summary: %d succeeded, %d failed out of %d total\n", successCount, failureCount, len(execResults))
		}

		// Format results for Anthropic
		toolResultsContent := make([]map[string]interface{}, 0, len(execResults))
		for _, execResult := range execResults {
			toolResultsContent = append(toolResultsContent, FormatAnthropicToolResult(execResult))
		}

		// Append assistant message (what was returned earlier)
		assistantContent := []map[string]interface{}{}
		for _, t := range cr.TextContent {
			assistantContent = append(assistantContent, map[string]interface{}{
				"type": "text",
				"text": t,
			})
		}
		for _, tu := range cr.ToolUses {
			assistantContent = append(assistantContent, map[string]interface{}{
				"type":  "tool_use",
				"id":    tu.ID,
				"name":  tu.Name,
				"input": tu.Input,
			})
		}
		workingMessages = append(workingMessages, Message{
			Role:    "assistant",
			Content: assistantContent,
		})

		// Append user message with tool results
		workingMessages = append(workingMessages, Message{
			Role:    "user",
			Content: toolResultsContent,
		})

	}

	// Max iterations reached - tools were executed but Claude didn't finish responding.
	// Instead of failing (which would lose all work), make one final call WITHOUT tools
	// so Claude can provide a text summary of what was done.
	fmt.Printf("[anthropic] Max iterations (%d) reached. Making final call for text response.\n", maxIterations)

	// Add a user message asking for a summary of what was done
	workingMessages = append(workingMessages, Message{
		Role:    "user",
		Content: "You have reached the maximum number of tool iterations. Please provide a summary of what you have accomplished so far and what remains to be done (if anything). Do not attempt to call any more tools.",
	})

	// Make one final call without tools to get a text summary
	var finalResp *ClaudeResponse
	var err error
	if streamCtx != nil && streamCtx.Client != nil {
		finalResp, err = StreamClaudeWithMessages(ctx, systemMessage, workingMessages, nil, streamCtx, temperature, maxTokens, modelID, enableThinking)
	} else {
		finalResp, err = callClaudeWithMessages(ctx, systemMessage, workingMessages, nil, temperature, maxTokens, modelID, enableThinking)
	}

	if err != nil {
		// If final call fails, return what we have with a warning (not an error)
		fmt.Printf("[anthropic] Warning: final summary call failed: %v. Returning last response.\n", err)
		return lastResp, nil
	}

	// Accumulate tokens from the final call
	if raw, ok := finalResp.RawResponse.(map[string]interface{}); ok {
		if usage, ok := raw["usage"].(map[string]interface{}); ok {
			if inputTokens, ok := usage["input_tokens"].(int); ok {
				totalInputTokens += inputTokens
			}
			if outputTokens, ok := usage["output_tokens"].(int); ok {
				totalOutputTokens += outputTokens
			}
		}
	}

	// Store cumulative usage in the final response
	if rawMap, ok := finalResp.RawResponse.(map[string]interface{}); ok {
		rawMap["usage"] = map[string]interface{}{
			"input_tokens":  totalInputTokens,
			"output_tokens": totalOutputTokens,
		}
		fmt.Printf("[anthropic] Final cumulative usage (with summary): input=%d, output=%d, total=%d\n",
			totalInputTokens, totalOutputTokens, totalInputTokens+totalOutputTokens)
	}

	// Fallback: if final response has no text content, return lastResp or default message
	if len(finalResp.TextContent) == 0 || (len(finalResp.TextContent) == 1 && strings.TrimSpace(finalResp.TextContent[0]) == "") {
		fmt.Printf("[anthropic] Final response has no text content. Returning last response.\n")
		if lastResp != nil && len(lastResp.TextContent) > 0 {
			// Update lastResp with cumulative usage before returning
			if rawMap, ok := lastResp.RawResponse.(map[string]interface{}); ok {
				rawMap["usage"] = map[string]interface{}{
					"input_tokens":  totalInputTokens,
					"output_tokens": totalOutputTokens,
				}
			}
			return lastResp, nil
		}
		// If lastResp also has no text, add a default message
		finalResp.TextContent = []string{"I completed several operations but reached the maximum iteration limit. Please check the board for the results."}
	}

	return finalResp, nil
}

/*
Here's what the Anthropic implementation looks like:

  Current Request Body (line 150-175):

  body := map[string]interface{}{
      "anthropic_version": "vertex-2023-10-16",
      "messages":          msgs,
      "max_tokens":        maxTokensValue,
      "stream":            false,
      // NO thinking parameter
  }

  To Add Extended Thinking, you'd add:

  body["thinking"] = map[string]interface{}{
      "type":          "enabled",
      "budget_tokens": 10000,  // max thinking tokens
  }

  Response would include thinking blocks:

  {
    "content": [
      {"type": "thinking", "thinking": "Let me analyze..."},
      {"type": "text", "text": "Here's my answer..."}
    ]
  }
*/
