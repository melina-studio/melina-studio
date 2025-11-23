package libraries

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

func callClaudeWithTools(ctx context.Context, prompt string, tools []map[string]interface{}) (*ClaudeResponse, error) {
	messages := []Message{
		{
			Role:    "user",
			Content: prompt,
		},
	}
	return callClaudeWithMessages(ctx, messages, tools)
}

func callClaudeWithMessages(ctx context.Context, messages []Message, tools []map[string]interface{}) (*ClaudeResponse, error) {
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT_ID")
	location := os.Getenv("GOOGLE_CLOUD_VERTEXAI_LOCATION") // "us-east5"
	modelID := "claude-sonnet-4-5@20250929"

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

// Your actual tool functions
func getWeather(location string, unit string) (map[string]interface{}, error) {
	// Your actual weather API call here
	// For now, simulating the response
	return map[string]interface{}{
		"location":    location,
		"temperature": 72,
		"condition":   "sunny",
		"humidity":    45,
		"unit":        unit,
	}, nil
}

func searchDatabase(query string, limit int) (map[string]interface{}, error) {
	// Your actual database search here
	return map[string]interface{}{
		"results": []map[string]string{
			{"id": "1", "name": "Result for " + query},
			{"id": "2", "name": "Another result"},
		},
		"count": 2,
	}, nil
}

// executeToolAndGetResponse handles the complete tool calling flow
func executeToolAndGetResponse(ctx context.Context, prompt string, tools []map[string]interface{}) (*ClaudeResponse, error) {
	// Step 1: Initial call to Claude
	resp, err := callClaudeWithTools(ctx, prompt, tools)
	if err != nil {
		return nil, err
	}

	// If no tool was called, return the response directly
	if len(resp.ToolUses) == 0 {
		return resp, nil
	}

	// Step 2: Build conversation with assistant's tool use
	messages := []Message{
		{
			Role:    "user",
			Content: prompt,
		},
	}

	// Add assistant's response with tool uses
	assistantContent := []map[string]interface{}{}

	// Add any text content from assistant
	for _, text := range resp.TextContent {
		assistantContent = append(assistantContent, map[string]interface{}{
			"type": "text",
			"text": text,
		})
	}

	// Add tool uses
	for _, toolUse := range resp.ToolUses {
		assistantContent = append(assistantContent, map[string]interface{}{
			"type":  "tool_use",
			"id":    toolUse.ID,
			"name":  toolUse.Name,
			"input": toolUse.Input,
		})
	}

	messages = append(messages, Message{
		Role:    "assistant",
		Content: assistantContent,
	})

	// Step 3: Execute tools and collect results
	toolResultsContent := []map[string]interface{}{}

	for _, toolUse := range resp.ToolUses {
		fmt.Printf("Executing tool: %s with input: %v\n", toolUse.Name, toolUse.Input)

		var result interface{}
		var err error

		// Directly call the appropriate function based on tool name
		switch toolUse.Name {
		case "get_weather":
			location := toolUse.Input["location"].(string)
			unit := "fahrenheit"
			if u, ok := toolUse.Input["unit"].(string); ok {
				unit = u
			}
			result, err = getWeather(location, unit)

		case "search_database":
			query := toolUse.Input["query"].(string)
			limit := 10
			if l, ok := toolUse.Input["limit"].(float64); ok {
				limit = int(l)
			}
			result, err = searchDatabase(query, limit)

		default:
			err = fmt.Errorf("unknown tool: %s", toolUse.Name)
		}

		if err != nil {
			// Return error as tool result
			toolResultsContent = append(toolResultsContent, map[string]interface{}{
				"type":        "tool_result",
				"tool_use_id": toolUse.ID,
				"content":     fmt.Sprintf("Error: %v", err),
				"is_error":    true,
			})
		} else {
			// Convert result to string (JSON)
			var resultStr string
			switch v := result.(type) {
			case string:
				resultStr = v
			default:
				jsonBytes, _ := json.Marshal(result)
				resultStr = string(jsonBytes)
			}

			toolResultsContent = append(toolResultsContent, map[string]interface{}{
				"type":        "tool_result",
				"tool_use_id": toolUse.ID,
				"content":     resultStr,
			})
		}
	}

	// Add tool results as user message
	messages = append(messages, Message{
		Role:    "user",
		Content: toolResultsContent,
	})

	// Step 4: Get final response from Claude with tool results
	finalResp, err := callClaudeWithMessages(ctx, messages, tools)
	if err != nil {
		return nil, err
	}

	return finalResp, nil
}

func Run() {
	ctx := context.Background()

	// for testing tools not required

	// call claude with tools
	resp, err := executeToolAndGetResponse(ctx, "are you claude sonnet 4.5?", nil)
	if err != nil {
		panic(err)
	}

	fmt.Printf("Stop Reason: %s\n", resp.StopReason)
	fmt.Println("Final Response:")
	for _, text := range resp.TextContent {
		fmt.Println(text)
	}

	// // call claude with messages
	// messages := []Message{
	// 	{
	// 		Role:    "user",
	// 		Content: "What's the weather like in Boston? Is it good for a picnic?",
	// 	},
	// }
	// resp2, err := callClaudeWithMessages(ctx, messages, tools)
	// if err != nil {
	// 	panic(err)
	// }

	// fmt.Println("Response:")
	// for _, text := range resp2.TextContent {
	// 	fmt.Println(text)
	// }
}
