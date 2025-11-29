package llmHandlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
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
type Message struct {
	Role    string
	Content interface{} // can be string or []map[string]interface{}
}

type streamEvent struct {
	Type    string `json:"type"` // e.g. "message_start", "content_block_delta", etc.
	Content []struct {
		Type string `json:"type"` // "text", "tool_use", etc.
		Text string `json:"text"` // for text blocks
	} `json:"content"`
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
			"content": m.Content, // string is fine for simple text
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
	onTextChunk func(chunk string) error,
) error {
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT_ID")
	location := os.Getenv("GOOGLE_CLOUD_VERTEXAI_LOCATION") // e.g. "us-east5"
	modelID := "claude-sonnet-4-5@20250929"                 // your model

	// ---------- 1) Auth HTTP client from SA JSON ----------
	enc := os.Getenv("GCP_SERVICE_ACCOUNT_CREDENTIALS")
	if enc == "" {
		return fmt.Errorf("GCP_SERVICE_ACCOUNT_CREDENTIALS not set")
	}
	saJSON, err := base64.StdEncoding.DecodeString(enc)
	if err != nil {
		return fmt.Errorf("decode sa json: %w", err)
	}

	creds, err := google.CredentialsFromJSON(ctx, saJSON, "https://www.googleapis.com/auth/cloud-platform")
	if err != nil {
		return fmt.Errorf("CredentialsFromJSON: %w", err)
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
		return fmt.Errorf("marshal body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	// ---------- 4) Do request & read SSE ----------
	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		buf := new(bytes.Buffer)
		_, _ = buf.ReadFrom(resp.Body)
		return fmt.Errorf("vertex error %d: %s", resp.StatusCode, buf.String())
	}

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

		// Extract text chunks from content blocks
		for _, block := range ev.Content {
			if block.Type == "text" && block.Text != "" {
				if err := onTextChunk(block.Text); err != nil {
					return err
				}
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("scanner error: %w", err)
	}

	return nil
}

// === Updated ExecuteToolFlow that uses dynamic dispatcher ===
func ChatWithTools(ctx context.Context, systemMessage string, messages []Message, tools []map[string]interface{}) (*ClaudeResponse, error) {
	const maxIterations = 8 // safety guard

	workingMessages := make([]Message, 0, len(messages)+6)
	workingMessages = append(workingMessages, messages...)

	var lastResp *ClaudeResponse
	for iter := 0; iter < maxIterations; iter++ {
		cr, err := callClaudeWithMessages(ctx, systemMessage, workingMessages, tools)
		if err != nil {
			return nil, fmt.Errorf("callClaudeWithMessages: %w", err)
		}
		lastResp = cr

		// If no tool uses, we're done
		if len(cr.ToolUses) == 0 {
			return cr, nil
		}

		// Build tool_results array
		toolResultsContent := make([]map[string]interface{}, 0, len(cr.ToolUses))
		for _, toolUse := range cr.ToolUses {
			fmt.Printf("[anthropic] executing tool: %s (id=%s) with input=%#v\n", toolUse.Name, toolUse.ID, toolUse.Input)

			// ensure input is map[string]interface{}
			input := make(map[string]interface{})
			if toolUse.Input != nil {
				for k, v := range toolUse.Input {
					input[k] = v
				}
			}

			// find handler
			handler, ok := getToolHandler(toolUse.Name)
			if !ok {
				// unknown tool -> return error-style tool_result
				toolResultsContent = append(toolResultsContent, map[string]interface{}{
					"type":        "tool_result",
					"tool_use_id": toolUse.ID,
					"content":     fmt.Sprintf("Error: unknown tool: %s", toolUse.Name),
					"is_error":    true,
				})
				continue
			}

			// run handler (with context)
			result, herr := handler(ctx, input)
			if herr != nil {
				toolResultsContent = append(toolResultsContent, map[string]interface{}{
					"type":        "tool_result",
					"tool_use_id": toolUse.ID,
					"content":     fmt.Sprintf("Error: %v", herr),
					"is_error":    true,
				})
				continue
			}

			// convert result to string representation
			var resultStr string
			switch v := result.(type) {
			case string:
				resultStr = v
			default:
				b, _ := json.Marshal(v)
				resultStr = string(b)
			}

			toolResultsContent = append(toolResultsContent, map[string]interface{}{
				"type":        "tool_result",
				"tool_use_id": toolUse.ID,
				"content":     resultStr,
			})
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
