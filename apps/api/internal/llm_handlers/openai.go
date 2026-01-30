package llmHandlers

import (
	"context"
	"fmt"
	"melina-studio-backend/internal/libraries"
	"os"
	"strings"
	"time"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/openai/openai-go/responses"
	"github.com/openai/openai-go/shared"
)

// OpenAIClient implements Client for OpenAI API
type OpenAIClient struct {
	client      openai.Client
	Model       string
	Temperature *float32
	MaxTokens   *int
	Tools       []map[string]interface{}
}

// OpenAIResponse contains the parsed response from OpenAI
type OpenAIResponse struct {
	TextContent      []string
	ReasoningContent string
	ToolCalls        []ToolCall
	RawResponse      interface{}
}

func NewOpenAIClient(model string, tools []map[string]interface{}, temperature *float32, maxTokens *int) (*OpenAIClient, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")

	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY must be set")
	}

	client := openai.NewClient(option.WithAPIKey(apiKey))

	return &OpenAIClient{
		client:      client,
		Model:       model,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		Tools:       tools,
	}, nil
}

// convertToolsToOpenAITools converts tool definitions to OpenAI Responses API format
func convertToolsToOpenAITools(tools []map[string]interface{}) []responses.ToolUnionParam {
	if len(tools) == 0 {
		return nil
	}

	openAITools := make([]responses.ToolUnionParam, 0, len(tools))
	for _, toolMap := range tools {
		if toolType, ok := toolMap["type"].(string); ok && toolType == "function" {
			if fn, ok := toolMap["function"].(map[string]interface{}); ok {
				name, _ := fn["name"].(string)
				description, _ := fn["description"].(string)
				parameters, _ := fn["parameters"].(map[string]interface{})

				openAITools = append(openAITools, responses.ToolUnionParam{
					OfFunction: &responses.FunctionToolParam{
						Name:        name,
						Description: openai.String(description),
						Parameters:  parameters,
					},
				})
			}
		}
	}
	return openAITools
}

// callOpenAIWithMessages calls OpenAI Responses API and returns parsed response
func (c *OpenAIClient) callOpenAIWithMessages(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext, enableThinking bool) (*OpenAIResponse, error) {
	// Build input items for Responses API
	inputItems := []responses.ResponseInputItemUnionParam{}

	// Add system message if provided
	if systemMessage != "" {
		inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(
			systemMessage,
			responses.EasyInputMessageRoleSystem,
		))
	}

	// Convert messages to input items
	for _, m := range messages {
		role := strings.ToLower(string(m.Role))

		switch content := m.Content.(type) {
		case string:
			var msgRole responses.EasyInputMessageRole
			switch role {
			case "assistant":
				msgRole = responses.EasyInputMessageRoleAssistant
			case "system":
				continue // already handled above
			default:
				msgRole = responses.EasyInputMessageRoleUser
			}

			inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(
				content,
				msgRole,
			))

		case []map[string]interface{}:
			// Handle multi-part content (text, function responses)
			for _, block := range content {
				blockType, _ := block["type"].(string)

				switch blockType {
				case "text":
					if text, ok := block["text"].(string); ok {
						var msgRole responses.EasyInputMessageRole
						switch role {
						case "assistant":
							msgRole = responses.EasyInputMessageRoleAssistant
						default:
							msgRole = responses.EasyInputMessageRoleUser
						}
						inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(
							text,
							msgRole,
						))
					}
				case "function_response":
					if fn, ok := block["function"].(map[string]interface{}); ok {
						callID, _ := fn["call_id"].(string)
						responseStr, _ := fn["response"].(string)
						inputItems = append(inputItems, responses.ResponseInputItemParamOfFunctionCallOutput(
							callID,
							responseStr,
						))
					}
				}
			}
		}
	}

	// Build params
	params := responses.ResponseNewParams{
		Model: c.Model,
		Input: responses.ResponseNewParamsInputUnion{
			OfInputItemList: inputItems,
		},
	}

	// Add tools if available
	openAITools := convertToolsToOpenAITools(c.Tools)
	if len(openAITools) > 0 {
		params.Tools = openAITools
	}

	// Add reasoning configuration if thinking is enabled
	// Note: temperature is NOT supported with reasoning models
	if enableThinking {
		params.Reasoning = shared.ReasoningParam{
			Effort:  shared.ReasoningEffortMedium,
			Summary: shared.ReasoningSummaryAuto,
		}
	} else {
		// Only add temperature when NOT using reasoning (not supported with reasoning models)
		if c.Temperature != nil {
			params.Temperature = openai.Float(float64(*c.Temperature))
		}
	}

	// Add max tokens if configured
	if c.MaxTokens != nil {
		params.MaxOutputTokens = openai.Int(int64(*c.MaxTokens))
	}

	// Initialize response
	or := &OpenAIResponse{
		TextContent: []string{},
		ToolCalls:   []ToolCall{},
	}

	// Use streaming if streaming context is provided
	if streamCtx != nil && streamCtx.Client != nil {
		var accumulatedText strings.Builder
		var accumulatedThinking strings.Builder
		var thinkingStarted, thinkingCompleted bool

		// Create streaming request
		stream := c.client.Responses.NewStreaming(ctx, params)

		for stream.Next() {
			event := stream.Current()

			switch event.Type {
			case "response.reasoning_summary_text.delta":
				// Thinking/reasoning content delta
				if !thinkingStarted {
					thinkingStarted = true
					libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingStart)
				}

				// Get text from the Delta.OfString field
				textDelta := event.Delta.OfString
				if textDelta != "" {
					accumulatedThinking.WriteString(textDelta)

					payload := &libraries.ChatMessageResponsePayload{
						Message: textDelta,
					}
					if streamCtx.BoardId != "" {
						payload.BoardId = streamCtx.BoardId
					}
					libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingResponse, payload)
				}

			case "response.reasoning_summary_text.done", "response.reasoning_summary_part.done":
				// Thinking completed
				if thinkingStarted && !thinkingCompleted {
					thinkingCompleted = true
					libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingCompleted)
				}

			case "response.output_text.delta":
				// Regular text content delta
				if thinkingStarted && !thinkingCompleted {
					thinkingCompleted = true
					libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingCompleted)
				}

				// Get text from the Delta.OfString field
				textDelta := event.Delta.OfString
				if textDelta != "" {
					accumulatedText.WriteString(textDelta)

					payload := &libraries.ChatMessageResponsePayload{
						Message: textDelta,
					}
					if streamCtx.BoardId != "" {
						payload.BoardId = streamCtx.BoardId
					}
					libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
				}

			case "response.function_call_arguments.done":
				// Function call completed - extract from Item field
				if event.Item.Type == "function_call" {
					or.ToolCalls = append(or.ToolCalls, ToolCall{
						ID:       event.Item.CallID,
						Name:     event.Item.Name,
						Input:    map[string]interface{}{"arguments": event.Item.Arguments},
						Provider: "openai",
					})
				}

			case "response.completed":
				// Response completed
				or.RawResponse = event.Response
			}
		}

		if err := stream.Err(); err != nil {
			return nil, fmt.Errorf("openai stream error: %w", err)
		}

		// Handle edge case
		if thinkingStarted && !thinkingCompleted {
			libraries.SendEventType(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeThinkingCompleted)
		}

		or.TextContent = []string{accumulatedText.String()}
		or.ReasoningContent = accumulatedThinking.String()

	} else {
		// Non-streaming path
		resp, err := c.client.Responses.New(ctx, params)
		if err != nil {
			return nil, fmt.Errorf("openai Responses.New: %w", err)
		}

		or.RawResponse = resp

		// Extract content from response
		for _, item := range resp.Output {
			if item.Type == "message" {
				for _, content := range item.Content {
					if content.Type == "output_text" {
						or.TextContent = append(or.TextContent, content.Text)
					}
				}
			} else if item.Type == "function_call" {
				or.ToolCalls = append(or.ToolCalls, ToolCall{
					ID:       item.CallID,
					Name:     item.Name,
					Input:    map[string]interface{}{"arguments": item.Arguments},
					Provider: "openai",
				})
			} else if item.Type == "reasoning" {
				for _, summary := range item.Summary {
					or.ReasoningContent += summary.Text
				}
			}
		}
	}

	return or, nil
}

// ChatWithTools handles tool execution loop
func (c *OpenAIClient) ChatWithTools(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext, enableThinking bool) (*OpenAIResponse, error) {
	const maxIterations = 5

	workingMessages := make([]Message, 0, len(messages)+6)
	workingMessages = append(workingMessages, messages...)

	var lastResp *OpenAIResponse

	for iter := 0; iter < maxIterations; iter++ {
		or, err := c.callOpenAIWithMessages(ctx, systemMessage, workingMessages, streamCtx, enableThinking)
		if err != nil {
			return nil, fmt.Errorf("callOpenAIWithMessages: %w", err)
		}
		lastResp = or

		// If no tool calls, we're done
		if len(or.ToolCalls) == 0 {
			return or, nil
		}

		// Execute tools using common executor
		execResults := ExecuteTools(ctx, or.ToolCalls, streamCtx)

		// Format results for OpenAI
		functionResults := []map[string]interface{}{}
		for _, execResult := range execResults {
			functionResults = append(functionResults, map[string]interface{}{
				"type": "function_response",
				"function": map[string]interface{}{
					"call_id":  execResult.ToolCallID,
					"name":     execResult.ToolName,
					"response": execResult.Result,
				},
			})
		}

		// Append assistant message with function calls
		assistantParts := []map[string]interface{}{}
		for _, text := range or.TextContent {
			if text != "" {
				assistantParts = append(assistantParts, map[string]interface{}{
					"type": "text",
					"text": text,
				})
			}
		}
		for _, tc := range or.ToolCalls {
			assistantParts = append(assistantParts, map[string]interface{}{
				"type": "function_call",
				"function": map[string]interface{}{
					"call_id":   tc.ID,
					"name":      tc.Name,
					"arguments": tc.Input["arguments"],
				},
			})
		}
		if len(assistantParts) > 0 {
			workingMessages = append(workingMessages, Message{
				Role:    "assistant",
				Content: assistantParts,
			})
		}

		// Append user message with function results
		workingMessages = append(workingMessages, Message{
			Role:    "user",
			Content: functionResults,
		})

		time.Sleep(50 * time.Millisecond)
	}

	// Max iterations reached
	fmt.Printf("[openai] Max iterations (%d) reached. Making final call for text response.\n", maxIterations)

	workingMessages = append(workingMessages, Message{
		Role:    "user",
		Content: "You have reached the maximum number of tool iterations. Please provide a summary of what you have accomplished so far.",
	})

	originalTools := c.Tools
	c.Tools = nil
	finalResp, err := c.callOpenAIWithMessages(ctx, systemMessage, workingMessages, streamCtx, enableThinking)
	c.Tools = originalTools

	if err != nil {
		fmt.Printf("[openai] Warning: final summary call failed: %v. Returning last response.\n", err)
		return lastResp, nil
	}

	if len(finalResp.TextContent) == 0 || (len(finalResp.TextContent) == 1 && strings.TrimSpace(finalResp.TextContent[0]) == "") {
		if lastResp != nil && len(lastResp.TextContent) > 0 {
			return lastResp, nil
		}
		finalResp.TextContent = []string{"I completed several operations but reached the maximum iteration limit."}
	}

	return finalResp, nil
}

func (c *OpenAIClient) Chat(ctx context.Context, systemMessage string, messages []Message, enableThinking bool) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	resp, err := c.ChatWithTools(ctx, systemMessage, messages, nil, enableThinking)
	if err != nil {
		return "", err
	}

	if len(resp.TextContent) == 0 {
		return "", fmt.Errorf("openai returned no text content")
	}

	return strings.Join(resp.TextContent, "\n\n"), nil
}

func (c *OpenAIClient) ChatStream(ctx context.Context, hub *libraries.Hub, client *libraries.Client, boardId string, systemMessage string, messages []Message, enableThinking bool) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
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

	if len(resp.TextContent) == 0 {
		return "", fmt.Errorf("openai returned no text content")
	}

	return strings.Join(resp.TextContent, "\n\n"), nil
}

func (c *OpenAIClient) ChatStreamWithUsage(req ChatStreamRequest) (*ResponseWithUsage, error) {
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

	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
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
		return nil, err
	}

	if len(resp.TextContent) == 0 {
		return nil, fmt.Errorf("openai returned no text content")
	}

	// Extract token usage - OpenAI includes it in the response
	tokenUsage := &TokenUsage{
		InputTokens:  0,
		OutputTokens: 0,
	}

	return &ResponseWithUsage{
		Text:       strings.Join(resp.TextContent, "\n\n"),
		Thinking:   resp.ReasoningContent,
		TokenUsage: tokenUsage,
	}, nil
}
