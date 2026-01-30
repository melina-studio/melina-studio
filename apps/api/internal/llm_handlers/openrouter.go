package llmHandlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/models"
	"os"
	"strings"
	"time"

	openrouter "github.com/revrost/go-openrouter"
)

type OpenRouterClient struct {
	client  *openrouter.Client
	modelID string

	Temperature float32
	MaxTokens   int
	Tools       []map[string]interface{}
}

// OpenRouterResponse contains the parsed response from OpenRouter
type OpenRouterResponse struct {
	TextContent      []string
	ReasoningContent string // Accumulated thinking/reasoning content
	FunctionCalls    []OpenRouterFunctionCall
	RawResponse      *openrouter.ChatCompletionResponse
}

// OpenRouterFunctionCall represents a function call from OpenRouter
type OpenRouterFunctionCall struct {
	ID        string
	Name      string
	Arguments map[string]interface{}
}

func NewOpenRouterClient(modelID string, temperature *float32, maxTokens *int, tools []map[string]interface{}) (*OpenRouterClient, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY is not set")
	}
	client := openrouter.NewClient(apiKey)

	// Set defaults if not provided
	tempValue := float32(0.2)
	if temperature != nil {
		tempValue = *temperature
	}

	maxTokensValue := 1024
	if maxTokens != nil {
		maxTokensValue = *maxTokens
	}

	return &OpenRouterClient{
		client:      client,
		modelID:     modelID,
		Temperature: tempValue,
		MaxTokens:   maxTokensValue,
		Tools:       tools,
	}, nil
}

// convertToolsToOpenRouterTools converts tool definitions to OpenRouter format
func (c *OpenRouterClient) convertToolsToOpenRouterTools() []openrouter.Tool {
	if len(c.Tools) == 0 {
		return nil
	}

	tools := make([]openrouter.Tool, 0, len(c.Tools))
	for _, toolMap := range c.Tools {
		// Handle OpenAI-style format: {"type": "function", "function": {...}}
		if toolType, ok := toolMap["type"].(string); ok && toolType == "function" {
			if fn, ok := toolMap["function"].(map[string]interface{}); ok {
				name, _ := fn["name"].(string)
				description, _ := fn["description"].(string)
				parameters, _ := fn["parameters"].(map[string]interface{})

				tools = append(tools, openrouter.Tool{
					Type: openrouter.ToolTypeFunction,
					Function: &openrouter.FunctionDefinition{
						Name:        name,
						Description: description,
						Parameters:  parameters,
					},
				})
			}
		}
	}
	return tools
}

// convertMessagesToOpenRouterMessages converts our Message format to OpenRouter messages
func (c *OpenRouterClient) convertMessagesToOpenRouterMessages(messages []Message) []openrouter.ChatCompletionMessage {
	msgs := make([]openrouter.ChatCompletionMessage, 0, len(messages))

	for _, m := range messages {
		// Handle content - can be string or []map[string]interface{} (for images, tool results)
		switch content := m.Content.(type) {
		case string:
			switch m.Role {
			case "system":
				msgs = append(msgs, openrouter.SystemMessage(content))
			case "assistant":
				msgs = append(msgs, openrouter.AssistantMessage(content))
			case "tool":
				// Tool messages need tool_call_id - extract from metadata if available
				msgs = append(msgs, openrouter.ChatCompletionMessage{
					Role:    "tool",
					Content: openrouter.Content{Text: content},
				})
			default:
				msgs = append(msgs, openrouter.UserMessage(content))
			}

		case []map[string]interface{}:
			// Multi-part content - extract text parts
			var textParts []string
			for _, block := range content {
				blockType, _ := block["type"].(string)
				switch blockType {
				case "text":
					if text, ok := block["text"].(string); ok {
						textParts = append(textParts, text)
					}
				case "image":
					// OpenRouter supports image URLs via content array
					if source, ok := block["source"].(map[string]interface{}); ok {
						mediaType, _ := source["media_type"].(string)
						dataStr, _ := source["data"].(string)
						dataURI := fmt.Sprintf("data:%s;base64,%s", mediaType, dataStr)
						// For now, add as text description - full image support would use ChatMessagePart
						textParts = append(textParts, fmt.Sprintf("[Image: %s]", dataURI[:min(50, len(dataURI))]+"..."))
					}
				}
			}
			if len(textParts) > 0 {
				combinedText := strings.Join(textParts, "\n")
				switch m.Role {
				case "assistant":
					msgs = append(msgs, openrouter.AssistantMessage(combinedText))
				default:
					msgs = append(msgs, openrouter.UserMessage(combinedText))
				}
			}
		}
	}

	return msgs
}

// callOpenRouterWithMessages calls OpenRouter API and returns parsed response
func (c *OpenRouterClient) callOpenRouterWithMessages(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext, enableThinking bool) (*OpenRouterResponse, error) {
	msgs := c.convertMessagesToOpenRouterMessages(messages)

	// Add system message if provided
	if systemMessage != "" {
		msgs = append([]openrouter.ChatCompletionMessage{
			openrouter.SystemMessage(systemMessage),
		}, msgs...)
	}

	// TODO: Add thinking support
	fmt.Printf("[openrouter] Thinking support: %v\n", enableThinking)

	// Build request
	req := openrouter.ChatCompletionRequest{
		Model:       c.modelID,
		Messages:    msgs,
		Temperature: c.Temperature,
		MaxTokens:   c.MaxTokens,
	}

	if enableThinking {
		// NOTE: The SDK has a bug where Effort is serialized as "prompt" instead of "effort"
		// Workaround: Use MaxTokens instead which is correctly mapped
		// Setting max_tokens for reasoning allocates budget for thinking
		excludeReasoning := false
		maxReasoningTokens := 16000 // Allocate 16k tokens for reasoning
		req.Reasoning = &openrouter.ChatCompletionReasoning{
			MaxTokens: &maxReasoningTokens,
			Enabled:   &enableThinking,
			Exclude:   &excludeReasoning,
		}
		fmt.Printf("[openrouter] Reasoning config: Enabled=%v, Exclude=%v, MaxTokens=%d\n",
			enableThinking, excludeReasoning, maxReasoningTokens)

		// Debug: Log the actual JSON being sent for reasoning
		if reasoningJSON, err := json.Marshal(req.Reasoning); err == nil {
			fmt.Printf("[openrouter] Reasoning JSON: %s\n", string(reasoningJSON))
		}
	}

	// Add tools if available
	tools := c.convertToolsToOpenRouterTools()
	if len(tools) > 0 {
		req.Tools = tools
		req.ToolChoice = "auto"
		fmt.Printf("[openrouter] Added %d tools to request with tool_choice=auto\n", len(tools))
	}

	// Handle streaming - always use streaming when we have a client
	// ShouldStream controls whether to send immediately or buffer
	if streamCtx != nil && streamCtx.Client != nil {
		return c.callWithStreaming(ctx, req, streamCtx)
	}

	// Non-streaming call
	resp, err := c.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("openrouter CreateChatCompletion: %w", err)
	}

	return c.parseResponse(&resp)
}

// callWithStreaming handles streaming responses
func (c *OpenRouterClient) callWithStreaming(ctx context.Context, req openrouter.ChatCompletionRequest, streamCtx *StreamingContext) (*OpenRouterResponse, error) {
	req.Stream = true

	stream, err := c.client.CreateChatCompletionStream(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("openrouter CreateChatCompletionStream: %w", err)
	}
	defer stream.Close()

	var fullContent strings.Builder
	var accumulatedThinking strings.Builder
	var thinkingStarted, thinkingCompleted bool
	var insideThinkTag bool            // Track if we're currently inside <think> tags
	var pendingContent strings.Builder // Buffer content to check for tags
	var toolCalls []OpenRouterFunctionCall
	debugChunkCount := 0 // Debug counter

	toolCallsMap := make(map[int]*OpenRouterFunctionCall) // Track tool calls by index
	toolArgsBuffer := make(map[int]*strings.Builder)      // Buffer arguments as they stream

	for {
		chunk, err := stream.Recv()
		if err != nil {
			// Check for end of stream
			if err == io.EOF {
				break
			}
			return nil, fmt.Errorf("stream recv error: %w", err)
		}

		if len(chunk.Choices) == 0 {
			continue
		}

		choice := chunk.Choices[0]
		delta := choice.Delta
		debugChunkCount++

		// Handle reasoning/thinking content (check multiple fields for different model formats)
		reasoningText := ""
		// Check delta.Reasoning pointer
		if delta.Reasoning != nil && *delta.Reasoning != "" {
			reasoningText = *delta.Reasoning
		}
		// Check delta.ReasoningContent (DeepSeek style)
		if reasoningText == "" && delta.ReasoningContent != "" {
			reasoningText = delta.ReasoningContent
		}
		// Check delta.ReasoningDetails array
		if reasoningText == "" && len(delta.ReasoningDetails) > 0 {
			for _, detail := range delta.ReasoningDetails {
				if detail.Text != "" {
					reasoningText += detail.Text
				}
			}
		}

		if reasoningText != "" {
			if !thinkingStarted {
				thinkingStarted = true
				libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingStart)
			}

			accumulatedThinking.WriteString(reasoningText)

			if streamCtx.ShouldStream {
				payload := &libraries.ChatMessageResponsePayload{
					Message: reasoningText,
				}
				if streamCtx.BoardId != "" {
					payload.BoardId = streamCtx.BoardId
				}
				libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingResponse, payload)
			}
		}

		// Handle content chunks (delta.Content is a string in streaming)
		// Parse <think> tags for models like Kimi K2 Thinking
		if delta.Content != "" {
			// If we were receiving structured reasoning and now getting content, thinking is complete
			if thinkingStarted && !thinkingCompleted && reasoningText == "" {
				thinkingCompleted = true
				libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingCompleted)
			}

			// Log potential tags for debugging (case-insensitive)
			pendingContent.WriteString(delta.Content)
			content := pendingContent.String()

			// Process content looking for <think> and </think> tags (case-insensitive)
			for len(content) > 0 {
				lowerContentLoop := strings.ToLower(content)
				if insideThinkTag {
					// Look for </think> closing tag (case-insensitive)
					if idx := strings.Index(lowerContentLoop, "</think>"); idx != -1 {
						// Everything before </think> is thinking content
						thinkingChunk := content[:idx]
						if thinkingChunk != "" {
							accumulatedThinking.WriteString(thinkingChunk)
							if streamCtx.ShouldStream {
								payload := &libraries.ChatMessageResponsePayload{Message: thinkingChunk}
								if streamCtx.BoardId != "" {
									payload.BoardId = streamCtx.BoardId
								}
								libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingResponse, payload)
							}
						}
						// End thinking
						insideThinkTag = false
						thinkingCompleted = true
						libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingCompleted)
						content = content[idx+8:] // Skip past </think>
					} else {
						// No closing tag yet, stream all as thinking (but keep last 8 chars in case tag is split)
						if len(content) > 8 {
							thinkingChunk := content[:len(content)-8]
							accumulatedThinking.WriteString(thinkingChunk)
							if streamCtx.ShouldStream {
								payload := &libraries.ChatMessageResponsePayload{Message: thinkingChunk}
								if streamCtx.BoardId != "" {
									payload.BoardId = streamCtx.BoardId
								}
								libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingResponse, payload)
							}
							content = content[len(content)-8:]
						}
						break // Wait for more content
					}
				} else {
					// Look for <think> opening tag (case-insensitive)
					if idx := strings.Index(lowerContentLoop, "<think>"); idx != -1 {
						// Everything before <think> is regular content
						regularChunk := content[:idx]
						if regularChunk != "" {
							fullContent.WriteString(regularChunk)
							if streamCtx.ShouldStream {
								payload := &libraries.ChatMessageResponsePayload{Message: regularChunk}
								if streamCtx.BoardId != "" {
									payload.BoardId = streamCtx.BoardId
								}
								libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
							}
						}
						// Start thinking
						insideThinkTag = true
						if !thinkingStarted {
							thinkingStarted = true
							libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingStart)
						}
						content = content[idx+7:] // Skip past <think>
					} else {
						// No opening tag, stream as regular content (but keep last 7 chars in case tag is split)
						if len(content) > 7 {
							regularChunk := content[:len(content)-7]
							fullContent.WriteString(regularChunk)
							if streamCtx.ShouldStream {
								payload := &libraries.ChatMessageResponsePayload{Message: regularChunk}
								if streamCtx.BoardId != "" {
									payload.BoardId = streamCtx.BoardId
								}
								libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
							}
							content = content[len(content)-7:]
						}
						break // Wait for more content
					}
				}
			}
			pendingContent.Reset()
			pendingContent.WriteString(content) // Keep remaining for next iteration
		}

		// Handle tool call chunks
		if len(delta.ToolCalls) > 0 {
			for _, tc := range delta.ToolCalls {
				idx := 0
				if tc.Index != nil {
					idx = *tc.Index
				}

				if _, exists := toolCallsMap[idx]; !exists {
					toolCallsMap[idx] = &OpenRouterFunctionCall{
						ID:        tc.ID,
						Name:      tc.Function.Name,
						Arguments: make(map[string]interface{}),
					}
					toolArgsBuffer[idx] = &strings.Builder{}
				}

				// Update ID and name if provided (they come in the first chunk)
				if tc.ID != "" {
					toolCallsMap[idx].ID = tc.ID
				}
				if tc.Function.Name != "" {
					toolCallsMap[idx].Name = tc.Function.Name
				}

				// Accumulate arguments (they come as JSON string chunks)
				if tc.Function.Arguments != "" {
					toolArgsBuffer[idx].WriteString(tc.Function.Arguments)
				}
			}
		}

		// Check for finish reason
		if choice.FinishReason != "" {
			break
		}
	}

	// Flush any remaining pending content
	if pendingContent.Len() > 0 {
		remaining := pendingContent.String()
		if insideThinkTag {
			// Remaining content is thinking
			accumulatedThinking.WriteString(remaining)
			if streamCtx.ShouldStream {
				payload := &libraries.ChatMessageResponsePayload{Message: remaining}
				if streamCtx.BoardId != "" {
					payload.BoardId = streamCtx.BoardId
				}
				libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingResponse, payload)
			}
		} else {
			// Remaining content is regular
			fullContent.WriteString(remaining)
			if streamCtx.ShouldStream {
				payload := &libraries.ChatMessageResponsePayload{Message: remaining}
				if streamCtx.BoardId != "" {
					payload.BoardId = streamCtx.BoardId
				}
				libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
			}
		}
	}

	// Handle edge case: thinking started but never completed (no regular content followed)
	if thinkingStarted && !thinkingCompleted {
		libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingCompleted)
	}

	// Parse accumulated arguments for each tool call
	for idx, tc := range toolCallsMap {
		if argsBuffer, exists := toolArgsBuffer[idx]; exists && argsBuffer.Len() > 0 {
			var args map[string]interface{}
			if err := json.Unmarshal([]byte(argsBuffer.String()), &args); err == nil {
				tc.Arguments = args
			}
		}
		toolCalls = append(toolCalls, *tc)
	}

	result := &OpenRouterResponse{
		FunctionCalls:    toolCalls,
		ReasoningContent: accumulatedThinking.String(),
	}

	if fullContent.Len() > 0 {
		result.TextContent = []string{fullContent.String()}
	}

	return result, nil
}

// parseResponse parses a non-streaming response
func (c *OpenRouterClient) parseResponse(resp *openrouter.ChatCompletionResponse) (*OpenRouterResponse, error) {
	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("openrouter returned no choices")
	}

	result := &OpenRouterResponse{
		RawResponse: resp,
	}

	choice := resp.Choices[0]

	// Extract text content
	if choice.Message.Content.Text != "" {
		result.TextContent = append(result.TextContent, choice.Message.Content.Text)
	}

	// Extract tool calls
	if len(choice.Message.ToolCalls) > 0 {
		for _, tc := range choice.Message.ToolCalls {
			var args map[string]interface{}
			if tc.Function.Arguments != "" {
				if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
					args = make(map[string]interface{})
				}
			} else {
				args = make(map[string]interface{})
			}

			result.FunctionCalls = append(result.FunctionCalls, OpenRouterFunctionCall{
				ID:        tc.ID,
				Name:      tc.Function.Name,
				Arguments: args,
			})
		}
	}

	return result, nil
}

// ChatWithTools handles tool execution loop
func (c *OpenRouterClient) ChatWithTools(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext, enableThinking bool) (*OpenRouterResponse, error) {
	const maxIterations = 5

	workingMessages := make([]Message, 0, len(messages)+6)
	workingMessages = append(workingMessages, messages...)

	var lastResp *OpenRouterResponse
	var totalPromptTokens, totalCompletionTokens int

	for iter := 0; iter < maxIterations; iter++ {
		// Prepare streaming context for this iteration
		var currentStreamCtx *StreamingContext
		if streamCtx != nil && streamCtx.Client != nil {
			// Always stream text immediately - we can handle tool calls after
			// streaming the text content
			currentStreamCtx = &StreamingContext{
				Hub:            streamCtx.Hub,
				Client:         streamCtx.Client,
				BoardId:        streamCtx.BoardId,
				UserID:         streamCtx.UserID,
				BufferedChunks: make([]string, 0),
				ShouldStream:   true,
			}
		}

		lr, err := c.callOpenRouterWithMessages(ctx, systemMessage, workingMessages, currentStreamCtx, enableThinking)
		if err != nil {
			return nil, fmt.Errorf("callOpenRouterWithMessages: %w", err)
		}
		lastResp = lr

		// Accumulate token usage
		if lr.RawResponse != nil {
			totalPromptTokens += lr.RawResponse.Usage.PromptTokens
			totalCompletionTokens += lr.RawResponse.Usage.CompletionTokens
		}

		// If no function calls, this is the final iteration
		if len(lr.FunctionCalls) == 0 {
			// Send buffered chunks
			if currentStreamCtx != nil && len(currentStreamCtx.BufferedChunks) > 0 {
				for _, chunk := range currentStreamCtx.BufferedChunks {
					payload := &libraries.ChatMessageResponsePayload{
						Message: chunk,
					}
					if currentStreamCtx.BoardId != "" {
						payload.BoardId = currentStreamCtx.BoardId
					}
					libraries.SendChatMessageResponse(currentStreamCtx.Hub, currentStreamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
				}
			}
			return lr, nil
		}

		// Convert FunctionCalls to common ToolCall format
		toolCalls := make([]ToolCall, len(lr.FunctionCalls))
		for i, fc := range lr.FunctionCalls {
			toolCalls[i] = ToolCall{
				ID:       fc.ID,
				Name:     fc.Name,
				Input:    fc.Arguments,
				Provider: "openrouter",
			}
		}

		// IMPORTANT: Add assistant's response with tool calls to message history
		// This lets the model know what it asked for in previous iterations
		assistantContent := ""
		if len(lr.TextContent) > 0 {
			assistantContent = lr.TextContent[0]
		}
		// Build a summary of tool calls for the assistant message
		var toolCallSummary []string
		for _, fc := range lr.FunctionCalls {
			argsJSON, _ := json.Marshal(fc.Arguments)
			toolCallSummary = append(toolCallSummary, fmt.Sprintf("[Tool Call: %s(%s)]", fc.Name, string(argsJSON)))
		}
		if len(toolCallSummary) > 0 {
			if assistantContent != "" {
				assistantContent += "\n"
			}
			assistantContent += strings.Join(toolCallSummary, "\n")
		}
		workingMessages = append(workingMessages, Message{
			Role:    "assistant",
			Content: assistantContent,
		})

		// Execute tools
		execResults := ExecuteTools(ctx, toolCalls, currentStreamCtx)

		// Format results for OpenRouter (OpenAI-compatible)
		var toolResultTexts []string
		var imageContentBlocks []map[string]interface{}

		for _, execResult := range execResults {
			funcResp, imgBlocks := FormatLangChainToolResult(execResult)
			if textContent, ok := funcResp["text"].(string); ok {
				toolResultTexts = append(toolResultTexts, textContent)
			}
			imageContentBlocks = append(imageContentBlocks, imgBlocks...)
		}

		// Append tool results as user message (simulating tool response)
		if len(toolResultTexts) > 0 {
			combinedResult := "[Tool Results]\n" + strings.Join(toolResultTexts, "\n")
			workingMessages = append(workingMessages, Message{
				Role:    "user",
				Content: combinedResult,
			})
		}

		// Add image content blocks if any
		if len(imageContentBlocks) > 0 {
			workingMessages = append(workingMessages, Message{
				Role:    "user",
				Content: imageContentBlocks,
			})
		}

		time.Sleep(50 * time.Millisecond)
	}

	// Max iterations reached - make final call without tools
	fmt.Printf("[openrouter] Max iterations (%d) reached. Making final call for text response.\n", maxIterations)

	workingMessages = append(workingMessages, Message{
		Role:    "user",
		Content: "You have reached the maximum number of tool iterations. Please provide a summary of what you have accomplished so far.",
	})

	// Disable tools for final call
	originalTools := c.Tools
	c.Tools = nil

	var finalStreamCtx *StreamingContext
	if streamCtx != nil && streamCtx.Client != nil {
		finalStreamCtx = &StreamingContext{
			Hub:            streamCtx.Hub,
			Client:         streamCtx.Client,
			BoardId:        streamCtx.BoardId,
			UserID:         streamCtx.UserID,
			BufferedChunks: make([]string, 0),
			ShouldStream:   true,
		}
	}

	finalResp, err := c.callOpenRouterWithMessages(ctx, systemMessage, workingMessages, finalStreamCtx, enableThinking)
	c.Tools = originalTools

	if err != nil {
		fmt.Printf("[openrouter] Warning: final summary call failed: %v\n", err)
		return lastResp, nil
	}

	// Send buffered chunks
	if finalStreamCtx != nil && len(finalStreamCtx.BufferedChunks) > 0 {
		for _, chunk := range finalStreamCtx.BufferedChunks {
			payload := &libraries.ChatMessageResponsePayload{
				Message: chunk,
			}
			if finalStreamCtx.BoardId != "" {
				payload.BoardId = finalStreamCtx.BoardId
			}
			libraries.SendChatMessageResponse(finalStreamCtx.Hub, finalStreamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
		}
	}

	if len(finalResp.TextContent) == 0 {
		finalResp.TextContent = []string{"I completed several operations but reached the maximum iteration limit."}
	}

	return finalResp, nil
}

// Chat implements the Client interface - non-streaming chat
func (c *OpenRouterClient) Chat(ctx context.Context, systemMessage string, messages []Message, enableThinking bool) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	resp, err := c.ChatWithTools(ctx, systemMessage, messages, nil, enableThinking)
	if err != nil {
		return "", err
	}

	if len(resp.TextContent) > 0 {
		return resp.TextContent[0], nil
	}

	if len(resp.FunctionCalls) > 0 {
		return "", fmt.Errorf("function calls were made but no final text response was generated")
	}

	return "", fmt.Errorf("openrouter returned no text content and no function calls")
}

// ChatStream implements the Client interface - streaming chat
func (c *OpenRouterClient) ChatStream(ctx context.Context, hub *libraries.Hub, client *libraries.Client, boardId string, systemMessage string, messages []Message, enableThinking bool) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	var streamCtx *StreamingContext
	if client != nil {
		streamCtx = &StreamingContext{
			Hub:     hub,
			Client:  client,
			BoardId: boardId,
			UserID:  client.UserID,
		}
	}

	resp, err := c.ChatWithTools(ctx, systemMessage, messages, streamCtx, enableThinking)
	if err != nil {
		return "", err
	}

	if len(resp.TextContent) > 0 {
		return resp.TextContent[0], nil
	}

	if len(resp.FunctionCalls) > 0 {
		return "", fmt.Errorf("function calls were made but no final text response was generated")
	}

	return "", fmt.Errorf("openrouter returned no text content and no function calls")
}

// ChatStreamWithUsage implements the Client interface - streaming chat with token usage
func (c *OpenRouterClient) ChatStreamWithUsage(req ChatStreamRequest) (*ResponseWithUsage, error) {
	ctx := req.Ctx
	hub := req.Hub
	client := req.Client
	boardId := req.BoardID
	systemMessage := req.SystemMessage
	messages := req.Messages
	enableThinking := req.EnableThinking

	if boardId == "" {
		return nil, fmt.Errorf("boardId is required")
	}

	ctx, cancel := context.WithTimeout(ctx, 120*time.Second)
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

	resp, err := c.ChatWithTools(ctx, systemMessage, messages, streamCtx, enableThinking)
	if err != nil {
		return nil, err
	}

	if len(resp.TextContent) == 0 {
		return nil, fmt.Errorf("openrouter returned no text content")
	}

	// Extract token usage from response
	tokenUsage := ExtractOpenRouterUsage(resp, inputText)

	return &ResponseWithUsage{
		Text:       resp.TextContent[0],
		Thinking:   resp.ReasoningContent,
		TokenUsage: tokenUsage,
	}, nil
}

// ExtractOpenRouterUsage extracts token usage from OpenRouter response
func ExtractOpenRouterUsage(response *OpenRouterResponse, inputText string) *TokenUsage {
	if response.RawResponse != nil {
		usage := response.RawResponse.Usage
		if usage.TotalTokens > 0 {
			return &TokenUsage{
				InputTokens:    usage.PromptTokens,
				OutputTokens:   usage.CompletionTokens,
				TotalTokens:    usage.TotalTokens,
				CountingMethod: "provider_api",
			}
		}
	}

	// Fallback to tiktoken estimation
	return estimateWithTiktoken(inputText, response.TextContent, "openai")
}

/*
Great news! The go-openrouter library fully supports reasoning/thinking parameters:

  Request - Enable Thinking:

  req := openrouter.ChatCompletionRequest{
      Model:    c.modelID,
      Messages: msgs,
      Reasoning: &openrouter.ChatCompletionReasoning{
          Effort:    openrouter.String("high"),  // "high", "medium", "low"
          // OR
          MaxTokens: &maxThinkingTokens,         // custom token budget
          Enabled:   &enabled,                   // true/false
          Exclude:   &exclude,                   // hide reasoning from response
      },
  }

  Response - Access Thinking:

  choice := resp.Choices[0]
  reasoning := choice.Reasoning           // string summary
  details := choice.ReasoningDetails      // []ChatCompletionReasoningDetails
  for _, detail := range details {
      fmt.Println(detail.Text)            // actual thinking content
  }

  Streaming:

  The library also supports streaming reasoning via ChatCompletionStream - you'd get reasoning chunks as they come in.

  Summary: ✅ Full support for thinking/reasoning in the library. Ready when you want to implement it!
*/
