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
	TextContent   []string
	FunctionCalls []OpenRouterFunctionCall
	RawResponse   *openrouter.ChatCompletionResponse
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
func (c *OpenRouterClient) callOpenRouterWithMessages(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext) (*OpenRouterResponse, error) {
	msgs := c.convertMessagesToOpenRouterMessages(messages)

	// Add system message if provided
	if systemMessage != "" {
		msgs = append([]openrouter.ChatCompletionMessage{
			openrouter.SystemMessage(systemMessage),
		}, msgs...)
	}

	// Build request
	req := openrouter.ChatCompletionRequest{
		Model:       c.modelID,
		Messages:    msgs,
		Temperature: c.Temperature,
		MaxTokens:   c.MaxTokens,
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
	var toolCalls []OpenRouterFunctionCall
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

		// Handle content chunks (delta.Content is a string in streaming)
		if delta.Content != "" {
			fullContent.WriteString(delta.Content)

			if streamCtx.ShouldStream {
				payload := &libraries.ChatMessageResponsePayload{
					Message: delta.Content,
				}
				if streamCtx.BoardId != "" {
					payload.BoardId = streamCtx.BoardId
				}
				libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
			} else {
				streamCtx.BufferedChunks = append(streamCtx.BufferedChunks, delta.Content)
			}
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
		FunctionCalls: toolCalls,
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
		fmt.Printf("[openrouter] Extracted %d function calls: %v\n", len(result.FunctionCalls), result.FunctionCalls)
	}

	return result, nil
}

// ChatWithTools handles tool execution loop
func (c *OpenRouterClient) ChatWithTools(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext) (*OpenRouterResponse, error) {
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

		lr, err := c.callOpenRouterWithMessages(ctx, systemMessage, workingMessages, currentStreamCtx)
		if err != nil {
			return nil, fmt.Errorf("callOpenRouterWithMessages: %w", err)
		}
		lastResp = lr

		// Accumulate token usage
		if lr.RawResponse != nil {
			totalPromptTokens += lr.RawResponse.Usage.PromptTokens
			totalCompletionTokens += lr.RawResponse.Usage.CompletionTokens
			fmt.Printf("[openrouter] Iteration %d token usage: prompt=%d, completion=%d\n",
				iter+1, lr.RawResponse.Usage.PromptTokens, lr.RawResponse.Usage.CompletionTokens)
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
		fmt.Printf("[openrouter] Added assistant message with %d tool calls\n", len(lr.FunctionCalls))

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

		fmt.Printf("[openrouter] Tool results formatted: %d results\n", len(toolResultTexts))

		// Append tool results as user message (simulating tool response)
		if len(toolResultTexts) > 0 {
			combinedResult := "[Tool Results]\n" + strings.Join(toolResultTexts, "\n")
			workingMessages = append(workingMessages, Message{
				Role:    "user",
				Content: combinedResult,
			})
			fmt.Printf("[openrouter] Added tool result message\n")
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

	finalResp, err := c.callOpenRouterWithMessages(ctx, systemMessage, workingMessages, finalStreamCtx)
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
func (c *OpenRouterClient) Chat(ctx context.Context, systemMessage string, messages []Message) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	resp, err := c.ChatWithTools(ctx, systemMessage, messages, nil)
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
func (c *OpenRouterClient) ChatStream(ctx context.Context, hub *libraries.Hub, client *libraries.Client, boardId string, systemMessage string, messages []Message) (string, error) {
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

	resp, err := c.ChatWithTools(ctx, systemMessage, messages, streamCtx)
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
func (c *OpenRouterClient) ChatStreamWithUsage(ctx context.Context, hub *libraries.Hub, client *libraries.Client, boardId string, systemMessage string, messages []Message) (*ResponseWithUsage, error) {
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

	resp, err := c.ChatWithTools(ctx, systemMessage, messages, streamCtx)
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
