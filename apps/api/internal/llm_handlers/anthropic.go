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
	"time"

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
	Delta        *streamDelta           `json:"delta,omitempty"`        // for content_block_delta
	StopReason   string                 `json:"stop_reason,omitempty"`  // for message_stop
	ContentBlock *streamContentBlockRef `json:"content_block,omitempty"` // for content_block_start
	Index        int                    `json:"index,omitempty"`         // block index for content_block_delta
}

type streamContentBlock struct {
	Type      string                 `json:"type"`      // "text", "tool_use", etc.
	Text      string                 `json:"text"`      // for text blocks
	ID        string                 `json:"id"`        // for tool_use blocks
	Name      string                 `json:"name"`      // for tool_use blocks
	Input     map[string]interface{} `json:"input"`     // for tool_use blocks (can be partial during streaming)
	Index     int                    `json:"index"`     // block index
	ToolUseID string                 `json:"tool_use_id,omitempty"` // for tool_result blocks
}

type streamDelta struct {
	Type        string `json:"type"`         // "text_delta", "input_json_delta", etc.
	Text        string `json:"text"`         // for text_delta
	Delta       string `json:"delta"`        // for input_json_delta (partial JSON) - some APIs use this
	PartialJSON string `json:"partial_json"` // for input_json_delta (partial JSON) - Vertex AI uses this
}

type streamContentBlockRef struct {
	Type  string `json:"type"`
	Index int    `json:"index"`
	ID    string `json:"id,omitempty"`   // for tool_use blocks
	Name  string `json:"name,omitempty"`  // for tool_use blocks
}

func callClaudeWithMessages(ctx context.Context, systemMessage string, messages []Message, tools []map[string]interface{}) (*ClaudeResponse, error) {
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT_ID")
	location := os.Getenv("GOOGLE_CLOUD_VERTEXAI_LOCATION") // "us-east5"
	modelID := os.Getenv("CLAUDE_VERTEX_MODEL")             // "claude-sonnet-4-5@20250929"

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
		"max_tokens":        1024,
		"stream":            false,
	}

	if systemMessage != "" {
		body["system"] = systemMessage
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
) (*ClaudeResponse, error) {
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT_ID")
	location := os.Getenv("GOOGLE_CLOUD_VERTEXAI_LOCATION") // e.g. "us-east5"
	modelID := "claude-sonnet-4-5@20250929"                 // your model

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
		"max_tokens":        1024,
		"stream":            true, // streaming flag
	}

	if systemMessage != "" {
		body["system"] = systemMessage
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
		ToolUses:     []ToolUse{},
	}

	// Track current text block being built
	var currentTextBuilder strings.Builder
	var accumulatedText strings.Builder

	// Track current tool_use block being built (by index)
	// Map of block index -> ToolUse being built
	currentToolUseBuilders := make(map[int]*ToolUse)
	currentToolUseInputBuilders := make(map[int]*strings.Builder) // for accumulating JSON input

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

		case "message_delta":
			// Message-level delta (usually contains stop_reason)
			if ev.StopReason != "" {
				cr.StopReason = ev.StopReason
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

	return cr, nil
}

// === Updated ExecuteToolFlow that uses dynamic dispatcher ===
func ChatWithTools(ctx context.Context, systemMessage string, messages []Message, tools []map[string]interface{}, streamCtx *StreamingContext) (*ClaudeResponse, error) {
	const maxIterations = 10 // safety guard - increased for complex drawings that need many shapes

	workingMessages := make([]Message, 0, len(messages)+6)
	workingMessages = append(workingMessages, messages...)

	var lastResp *ClaudeResponse
	for iter := 0; iter < maxIterations; iter++ {

		var cr *ClaudeResponse
		var err error
		if streamCtx != nil && streamCtx.Client != nil {
			cr, err = StreamClaudeWithMessages(ctx, systemMessage, workingMessages, tools, streamCtx)
			if err != nil {
				return nil, fmt.Errorf("StreamClaudeWithMessages: %w", err)
			}
		} else {
			cr, err = callClaudeWithMessages(ctx, systemMessage, workingMessages, tools)
		if err != nil {
			return nil, fmt.Errorf("callClaudeWithMessages: %w", err)
		}
		}

		if cr == nil {
			return nil, fmt.Errorf("received nil response from Claude")
		}

		lastResp = cr

		// If no tool uses, we're done
		if len(cr.ToolUses) == 0 {
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
		execResults := ExecuteTools(ctx, toolCalls , streamCtx)

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

		// small throttle (optional)
		time.Sleep(50 * time.Millisecond)
	}

	return lastResp, fmt.Errorf("max iterations reached (%d) while resolving tools", maxIterations)
}
