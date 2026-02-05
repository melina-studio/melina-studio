package llmHandlers

import (
	"context"
	"encoding/json"
	"fmt"
	"melina-studio-backend/internal/constants"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/models"
	"reflect"
	"strings"
	"time"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
)

type LangChainClient struct {
	llm         llms.Model
	Model       string // Store model name to check for thinking support
	Tools       []map[string]interface{}
	Temperature *float32 // Optional: nil means use default
	MaxTokens   *int     // Optional: nil means use default
}

// StreamingContext holds the context needed for streaming responses
type StreamingContext struct {
	Hub     *libraries.Hub
	Client  *libraries.Client
	BoardId string // Optional: empty string means don't include boardId in response
	UserID  string // User ID for authorization checks in tools
	// BufferedChunks stores chunks that should be sent only if there are no tool calls
	BufferedChunks []string
	// ShouldStream indicates whether chunks should be streamed immediately or buffered
	ShouldStream bool
	// LoaderGen is the loader generator for dynamic loader messages (optional)
	LoaderGen *LoaderGenerator
}

type LangChainConfig struct {
	Model       string                   // e.g. "gpt-4.1", "llama-3.1-70b-versatile"
	BaseURL     string                   // optional: for Groq or other OpenAI-compatible APIs
	APIKey      string                   // if not set, it'll fall back to env
	Tools       []map[string]interface{} // Tool definitions in OpenAI format
	Temperature *float32                 // Optional: nil means use default
	MaxTokens   *int                     // Optional: nil means use default
}

// LangChainResponse contains the parsed response from LangChain
type LangChainResponse struct {
	TextContent   []string
	FunctionCalls []LangChainFunctionCall
	RawResponse   *llms.ContentResponse
}

// LangChainFunctionCall represents a function call from LangChain (OpenAI-compatible)
type LangChainFunctionCall struct {
	Name      string
	Arguments map[string]interface{}
}

// isLlamaModel checks if the model is a Meta/Llama model (which doesn't support thinking)
func isLlamaModel(model string) bool {
	modelLower := strings.ToLower(model)
	return strings.Contains(modelLower, "llama") || strings.Contains(modelLower, "meta")
}

func NewLangChainClient(cfg LangChainConfig) (*LangChainClient, error) {
	opts := []openai.Option{
		openai.WithModel(cfg.Model),
	}
	if cfg.BaseURL != "" {
		opts = append(opts, openai.WithBaseURL(cfg.BaseURL))
	}
	if cfg.APIKey != "" {
		opts = append(opts, openai.WithToken(cfg.APIKey))
	}

	llm, err := openai.New(opts...)
	if err != nil {
		return nil, fmt.Errorf("create langchain openai client: %w", err)
	}

	return &LangChainClient{
		llm:         llm,
		Model:       cfg.Model,
		Tools:       cfg.Tools,
		Temperature: cfg.Temperature,
		MaxTokens:   cfg.MaxTokens,
	}, nil
}

// convertToolsToLangChainTools converts tool definitions to langchaingo format
func convertToolsToLangChainTools(tools []map[string]interface{}) []llms.FunctionDefinition {
	if len(tools) == 0 {
		return nil
	}

	langChainTools := make([]llms.FunctionDefinition, 0, len(tools))
	for _, toolMap := range tools {
		// Handle OpenAI-style format: {"type": "function", "function": {...}}
		if toolType, ok := toolMap["type"].(string); ok && toolType == "function" {
			if fn, ok := toolMap["function"].(map[string]interface{}); ok {
				name, _ := fn["name"].(string)
				description, _ := fn["description"].(string)
				parameters, _ := fn["parameters"].(map[string]interface{})

				// Parameters field is `any` type, so we pass the map directly
				// langchaingo will handle the JSON encoding internally
				langChainTools = append(langChainTools, llms.FunctionDefinition{
					Name:        name,
					Description: description,
					Parameters:  parameters, // Pass map directly, not JSON bytes
				})
			}
		}
	}
	return langChainTools
}

// convertMessagesToLangChainContent converts our Message format to langchaingo MessageContent
func (c *LangChainClient) convertMessagesToLangChainContent(messages []Message) ([]llms.MessageContent, error) {
	msgContents := make([]llms.MessageContent, 0, len(messages))

	for _, m := range messages {
		var msgType llms.ChatMessageType
		switch m.Role {
		case "system":
			msgType = llms.ChatMessageTypeSystem
		case "user":
			msgType = llms.ChatMessageTypeHuman
		case "assistant":
			msgType = llms.ChatMessageTypeAI
		default:
			msgType = llms.ChatMessageTypeHuman
		}

		// Handle content - can be string or []map[string]interface{} (for images, function calls)
		switch content := m.Content.(type) {
		case string:
			// Simple text message
			msgContents = append(msgContents, llms.TextParts(msgType, content))

		case []map[string]interface{}:
			// Multi-part content (text + images + function calls/responses)
			parts := []llms.ContentPart{}

			for _, block := range content {
				blockType, _ := block["type"].(string)

				switch blockType {
				case "text":
					if text, ok := block["text"].(string); ok {
						parts = append(parts, llms.TextPart(text))
					}

				case "image":
					if source, ok := block["source"].(map[string]interface{}); ok {
						mediaType, _ := source["media_type"].(string)
						dataStr, _ := source["data"].(string)

						// Groq/OpenAI-compatible APIs expect image_url format with data URI
						// Format: data:image/png;base64,{base64string}
						dataURI := fmt.Sprintf("data:%s;base64,%s", mediaType, dataStr)
						parts = append(parts, llms.ImageURLPart(dataURI))
					}

				case "function_call":
					// Skip function_call blocks - langchaingo handles these automatically
					// when using WithFunctions. Including them as text causes the model
					// to echo the function call details.
					continue

				case "function_response":
					// Convert function_response to text for the model to understand
					if fn, ok := block["function"].(map[string]interface{}); ok {
						responseStr, _ := fn["response"].(string)
						parts = append(parts, llms.TextPart(responseStr))
					}
				}
			}

			// Create MessageContent with all parts
			if len(parts) > 0 {
				msgContents = append(msgContents, llms.MessageContent{
					Role:  msgType,
					Parts: parts,
				})
			}

		default:
			return nil, fmt.Errorf("unsupported message content type for langchain: %T", m.Content)
		}
	}

	return msgContents, nil
}

// callLangChainWithMessages calls LangChain API and returns parsed response
func (c *LangChainClient) callLangChainWithMessages(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext, enableThinking bool) (*LangChainResponse, error) {
	msgContents, err := c.convertMessagesToLangChainContent(messages)
	if err != nil {
		return nil, fmt.Errorf("convert messages: %w", err)
	}

	// Add system message if provided
	if systemMessage != "" {
		msgContents = append([]llms.MessageContent{
			llms.TextParts(llms.ChatMessageTypeSystem, systemMessage),
		}, msgContents...)
	}

	// Convert tools to langchaingo format
	langChainTools := convertToolsToLangChainTools(c.Tools)

	streamingFunc := func(ctx context.Context, chunk []byte) error {
		// Only handle streaming if client is provided
		if streamCtx != nil && streamCtx.Client != nil {
			chunkStr := string(chunk)

			if streamCtx.ShouldStream {
				// Stream immediately (final iteration, no tool calls)
				payload := &libraries.ChatMessageResponsePayload{
					Message: chunkStr,
				}
				// Only include BoardId if it's not empty
				if streamCtx.BoardId != "" {
					payload.BoardId = streamCtx.BoardId
				}
				libraries.SendChatMessageResponse(streamCtx.Hub, streamCtx.Client, libraries.WebSocketMessageTypeChatResponse, payload)
			} else {
				// Buffer chunks (intermediate iteration, might have tool calls)
				streamCtx.BufferedChunks = append(streamCtx.BufferedChunks, chunkStr)
			}
		}
		return nil
	}

	// Build call options
	opts := []llms.CallOption{}

	// Add temperature if configured
	// Note: For Groq models, slightly higher temperature (0.3-0.5) helps with tool calling
	if c.Temperature != nil {
		opts = append(opts, llms.WithTemperature(float64(*c.Temperature)))
	}

	// Add max tokens if configured
	if c.MaxTokens != nil {
		opts = append(opts, llms.WithMaxTokens(*c.MaxTokens))
	}

	// Add thinking support - Meta/Llama models do NOT support thinking
	if enableThinking {
		if isLlamaModel(c.Model) {
			fmt.Printf("[langchain] Thinking requested but Llama model %s does not support it, skipping\n", c.Model)
		} else {
			fmt.Printf("[langchain] Enabling thinking for model: %s\n", c.Model)
			opts = append(opts, llms.WithThinking(&llms.ThinkingConfig{
				Mode:           llms.ThinkingMode("auto"),
				BudgetTokens:   1024, // Match the Anthropic budget
				ReturnThinking: true,
			}))
		}
	}

	// IMPORTANT: Always add tools if available, even if we're in a tool execution loop
	// This ensures Groq models know tools are available on every call
	if len(langChainTools) > 0 {
		// WithFunctions expects a single slice, not variadic
		opts = append(opts, llms.WithFunctions(langChainTools))

		// For Groq models, we can try to force tool usage by setting tool_choice
		// This helps when the model is being "lazy" and not calling tools
		// Note: This is OpenAI-compatible, so it should work with Groq
		opts = append(opts, llms.WithToolChoice("auto"))

		fmt.Printf("[langchain] Added %d tools to call options with tool_choice=auto\n", len(langChainTools))

		// Enable streaming if streaming context is provided
		if streamCtx != nil && streamCtx.Client != nil {
			opts = append(opts, llms.WithStreamingFunc(streamingFunc))
		}
	} else {
		fmt.Printf("[langchain] WARNING: No tools available for this call\n")
	}

	// Call GenerateContent
	resp, err := c.llm.GenerateContent(ctx, msgContents, opts...)
	if err != nil {
		return nil, fmt.Errorf("langchain GenerateContent: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("langchain returned no choices")
	}

	// Parse response
	lr := &LangChainResponse{
		RawResponse: resp,
	}

	choice := resp.Choices[0]

	// Extract text content
	if choice.Content != "" {
		lr.TextContent = append(lr.TextContent, choice.Content)
	}

	// Extract function calls from langchaingo response
	// langchaingo uses OpenAI-compatible format where function calls can be:
	// 1. Indicated by StopReason (e.g., "function_call", "tool_calls")
	// 2. Stored in the response structure

	// Check StopReason for function call indicators
	stopReason := choice.StopReason
	isFunctionCall := stopReason == "function_call" || stopReason == "tool_calls" ||
		stopReason == "function_calls" || strings.Contains(strings.ToLower(stopReason), "function")

	fmt.Printf("[langchain] StopReason: %s, isFunctionCall: %v, ToolCalls count: %d\n", stopReason, isFunctionCall, len(choice.ToolCalls))

	// Extract function calls from ToolCalls field
	// langchaingo stores tool calls in choice.ToolCalls
	if len(choice.ToolCalls) > 0 {
		for _, toolCall := range choice.ToolCalls {
			// toolCall has FunctionCall field which is a pointer to llms.FunctionCall
			if toolCall.FunctionCall != nil {
				var args map[string]interface{}

				// FunctionCall.Arguments is a JSON string, parse it
				if toolCall.FunctionCall.Arguments != "" {
					if err := json.Unmarshal([]byte(toolCall.FunctionCall.Arguments), &args); err != nil {
						// If unmarshal fails, create empty args
						args = make(map[string]interface{})
					}
				} else {
					args = make(map[string]interface{})
				}

				lr.FunctionCalls = append(lr.FunctionCalls, LangChainFunctionCall{
					Name:      toolCall.FunctionCall.Name,
					Arguments: args,
				})
			}
		}
	} else if isFunctionCall {
		// Fallback: Use reflection if ToolCalls field is empty but StopReason indicates function call
		// This handles edge cases or different langchaingo versions
		choiceValue := reflect.ValueOf(choice).Elem()
		choiceType := choiceValue.Type()

		for i := 0; i < choiceValue.NumField(); i++ {
			field := choiceValue.Field(i)
			fieldType := choiceType.Field(i)

			fieldName := strings.ToLower(fieldType.Name)
			if strings.Contains(fieldName, "tool") || strings.Contains(fieldName, "function") ||
				strings.Contains(fieldName, "call") {

				if field.Kind() == reflect.Slice {
					for j := 0; j < field.Len(); j++ {
						elem := field.Index(j)

						if elem.Kind() == reflect.Interface || elem.Kind() == reflect.Ptr {
							elem = elem.Elem()
						}

						if elem.Kind() == reflect.Struct {
							// Check for FunctionCall field within the tool call
							funcCallField := elem.FieldByName("FunctionCall")
							if funcCallField.IsValid() && !funcCallField.IsNil() {
								funcCall := funcCallField.Elem()
								nameField := funcCall.FieldByName("Name")
								argsField := funcCall.FieldByName("Arguments")

								if nameField.IsValid() && nameField.Kind() == reflect.String {
									name := nameField.String()
									var args map[string]interface{}

									// Arguments is a string (JSON), not []byte
									if argsField.IsValid() && argsField.Kind() == reflect.String {
										argsStr := argsField.String()
										if argsStr != "" {
											json.Unmarshal([]byte(argsStr), &args)
										}
									}

									if args == nil {
										args = make(map[string]interface{})
									}

									lr.FunctionCalls = append(lr.FunctionCalls, LangChainFunctionCall{
										Name:      name,
										Arguments: args,
									})
								}
							}
						}
					}
				}
			}
		}

		// If we still didn't find function calls, log for debugging
		if len(lr.FunctionCalls) == 0 {
			fmt.Printf("[langchain] StopReason indicates function call (%s) but couldn't extract function calls. Response structure: %+v\n", stopReason, choice)
		}
	}

	// Log final function call count
	if len(lr.FunctionCalls) > 0 {
		fmt.Printf("[langchain] Extracted %d function calls: %v\n", len(lr.FunctionCalls), lr.FunctionCalls)
	} else if len(langChainTools) > 0 {
		// Warn if tools were available but no calls were made
		fmt.Printf("[langchain] WARNING: Tools were available but model did not make any function calls. StopReason: %s\n", stopReason)
	}

	return lr, nil
}

// ChatWithTools handles tool execution loop similar to Anthropic's and Gemini's implementation
func (c *LangChainClient) ChatWithTools(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext, enableThinking bool) (*LangChainResponse, error) {
	maxIterations := constants.GetMaxIterations(ctx)

	workingMessages := make([]Message, 0, len(messages)+6)
	workingMessages = append(workingMessages, messages...)

	var lastResp *LangChainResponse

	// Accumulate token usage across all iterations
	var totalPromptTokens, totalCompletionTokens int

	for iter := 0; iter < maxIterations; iter++ {
		// Prepare streaming context for this iteration
		var currentStreamCtx *StreamingContext
		if streamCtx != nil && streamCtx.Client != nil {
			// Create a copy to avoid modifying the original
			currentStreamCtx = &StreamingContext{
				Hub:            streamCtx.Hub,
				Client:         streamCtx.Client,
				BoardId:        streamCtx.BoardId,
				UserID:         streamCtx.UserID,
				BufferedChunks: make([]string, 0),
				ShouldStream:   false, // Start with buffering - we'll decide after the call
			}
		}

		// Make the call with streaming enabled (but buffered)
		lr, err := c.callLangChainWithMessages(ctx, systemMessage, workingMessages, currentStreamCtx, enableThinking)
		if err != nil {
			return nil, fmt.Errorf("callLangChainWithMessages: %w", err)
		}
		lastResp = lr

		// Accumulate token usage from this iteration
		if lr.RawResponse != nil && len(lr.RawResponse.Choices) > 0 {
			choice := lr.RawResponse.Choices[0]
			if choice.GenerationInfo != nil {
				if promptTokens, ok := choice.GenerationInfo["PromptTokens"].(int); ok {
					totalPromptTokens += promptTokens
				}
				if completionTokens, ok := choice.GenerationInfo["CompletionTokens"].(int); ok {
					totalCompletionTokens += completionTokens
				}
				fmt.Printf("[langchain] Iteration %d token usage: prompt=%d, completion=%d (cumulative: prompt=%d, completion=%d)\n",
					iter+1, totalPromptTokens, totalCompletionTokens, totalPromptTokens, totalCompletionTokens)
			}
		}

		// If no function calls, this is the final iteration - send buffered chunks
		if len(lr.FunctionCalls) == 0 {
			// Store cumulative usage in the final response
			if lr.RawResponse != nil && len(lr.RawResponse.Choices) > 0 {
				choice := lr.RawResponse.Choices[0]
				if choice.GenerationInfo == nil {
					choice.GenerationInfo = make(map[string]any)
				}
				choice.GenerationInfo["PromptTokens"] = totalPromptTokens
				choice.GenerationInfo["CompletionTokens"] = totalCompletionTokens
				choice.GenerationInfo["TotalTokens"] = totalPromptTokens + totalCompletionTokens
				fmt.Printf("[langchain] Final cumulative usage: prompt=%d, completion=%d, total=%d\n",
					totalPromptTokens, totalCompletionTokens, totalPromptTokens+totalCompletionTokens)
			}

			// Final iteration - send all buffered chunks to the client
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

		// There are tool calls - discard buffered chunks (they were tool-related)
		// The buffered chunks will be ignored since we're in an intermediate iteration

		// Convert FunctionCalls to common ToolCall format
		toolCalls := make([]ToolCall, len(lr.FunctionCalls))
		for i, fc := range lr.FunctionCalls {
			toolCalls[i] = ToolCall{
				ID:       "", // LangChain/OpenAI doesn't use IDs in the same way
				Name:     fc.Name,
				Input:    fc.Arguments,
				Provider: "langchain",
			}
		}

		// Execute tools using common executor
		execResults := ExecuteTools(ctx, toolCalls, currentStreamCtx)

		// Format results for LangChain (OpenAI-compatible)
		functionResults := []map[string]interface{}{}
		var imageContentBlocks []map[string]interface{} // Collect images to add separately

		for _, execResult := range execResults {
			funcResp, imgBlocks := FormatLangChainToolResult(execResult)
			functionResults = append(functionResults, funcResp)
			imageContentBlocks = append(imageContentBlocks, imgBlocks...)
		}

		fmt.Printf("[langchain] Tool results formatted: %+v\n", functionResults)

		// Don't add assistant message with function calls to history
		// The model already knows it made the call, we just need to provide the result

		// Append user message with function results as simple text
		// Combine all tool results into a single clear message
		var toolResultTexts []string
		for _, fr := range functionResults {
			if textContent, ok := fr["text"].(string); ok {
				toolResultTexts = append(toolResultTexts, textContent)
			}
		}

		if len(toolResultTexts) > 0 {
			combinedResult := strings.Join(toolResultTexts, "\n")
			workingMessages = append(workingMessages, Message{
				Role:    "user",
				Content: combinedResult, // Simple string, not array of maps
			})
			fmt.Printf("[langchain] Added tool result message: %s\n", combinedResult)
		}

		// If we have image content blocks, add them as a separate user message
		// This allows the LLM to actually "see" the image
		if len(imageContentBlocks) > 0 {
			workingMessages = append(workingMessages, Message{
				Role:    "user",
				Content: imageContentBlocks,
			})
		}

		// Small throttle
		time.Sleep(50 * time.Millisecond)
	}

	// Max iterations reached - tools were executed but LLM didn't finish responding.
	// Instead of failing, make one final call WITHOUT tools for a text summary.
	fmt.Printf("[langchain] Max iterations (%d) reached. Making final call for text response.\n", maxIterations)

	// Add a user message asking for a summary of what was done
	workingMessages = append(workingMessages, Message{
		Role:    "user",
		Content: "You have reached the maximum number of tool iterations. Please provide a summary of what you have accomplished so far and what remains to be done (if anything). Do not attempt to call any more tools.",
	})

	// Temporarily disable tools for final call
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
			ShouldStream:   true, // Stream the final response immediately
		}
	}

	finalResp, err := c.callLangChainWithMessages(ctx, systemMessage, workingMessages, finalStreamCtx, enableThinking)
	c.Tools = originalTools

	if err != nil {
		fmt.Printf("[langchain] Warning: final summary call failed: %v. Returning last response.\n", err)
		// Update lastResp with cumulative usage before returning
		if lastResp != nil && lastResp.RawResponse != nil && len(lastResp.RawResponse.Choices) > 0 {
			choice := lastResp.RawResponse.Choices[0]
			if choice.GenerationInfo == nil {
				choice.GenerationInfo = make(map[string]any)
			}
			choice.GenerationInfo["PromptTokens"] = totalPromptTokens
			choice.GenerationInfo["CompletionTokens"] = totalCompletionTokens
			choice.GenerationInfo["TotalTokens"] = totalPromptTokens + totalCompletionTokens
		}
		return lastResp, nil
	}

	// Accumulate tokens from the final call
	if finalResp.RawResponse != nil && len(finalResp.RawResponse.Choices) > 0 {
		choice := finalResp.RawResponse.Choices[0]
		if choice.GenerationInfo != nil {
			if promptTokens, ok := choice.GenerationInfo["PromptTokens"].(int); ok {
				totalPromptTokens += promptTokens
			}
			if completionTokens, ok := choice.GenerationInfo["CompletionTokens"].(int); ok {
				totalCompletionTokens += completionTokens
			}
		}
	}

	// Store cumulative usage in the final response
	if finalResp.RawResponse != nil && len(finalResp.RawResponse.Choices) > 0 {
		choice := finalResp.RawResponse.Choices[0]
		if choice.GenerationInfo == nil {
			choice.GenerationInfo = make(map[string]any)
		}
		choice.GenerationInfo["PromptTokens"] = totalPromptTokens
		choice.GenerationInfo["CompletionTokens"] = totalCompletionTokens
		choice.GenerationInfo["TotalTokens"] = totalPromptTokens + totalCompletionTokens
		fmt.Printf("[langchain] Final cumulative usage (with summary): prompt=%d, completion=%d, total=%d\n",
			totalPromptTokens, totalCompletionTokens, totalPromptTokens+totalCompletionTokens)
	}

	// Send any buffered chunks from final response
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

	// Fallback: if final response has no text content, return lastResp or default message
	if len(finalResp.TextContent) == 0 || (len(finalResp.TextContent) == 1 && strings.TrimSpace(finalResp.TextContent[0]) == "") {
		fmt.Printf("[langchain] Final response has no text content. Returning last response.\n")
		if lastResp != nil && len(lastResp.TextContent) > 0 {
			// Update lastResp with cumulative usage before returning
			if lastResp.RawResponse != nil && len(lastResp.RawResponse.Choices) > 0 {
				choice := lastResp.RawResponse.Choices[0]
				if choice.GenerationInfo == nil {
					choice.GenerationInfo = make(map[string]any)
				}
				choice.GenerationInfo["PromptTokens"] = totalPromptTokens
				choice.GenerationInfo["CompletionTokens"] = totalCompletionTokens
				choice.GenerationInfo["TotalTokens"] = totalPromptTokens + totalCompletionTokens
			}
			return lastResp, nil
		}
		// If lastResp also has no text, add a default message
		finalResp.TextContent = []string{"I completed several operations but reached the maximum iteration limit. Please check the board for the results."}
	}

	return finalResp, nil
}

func (c *LangChainClient) Chat(ctx context.Context, systemMessage string, messages []Message, enableThinking bool) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	// No streaming context for regular Chat
	resp, err := c.ChatWithTools(ctx, systemMessage, messages, nil, enableThinking)
	if err != nil {
		return "", err
	}

	// If we have text content, return it
	if len(resp.TextContent) > 0 {
		return resp.TextContent[0], nil
	}

	// If we have function calls but no text, that's normal for function calling
	// The function calls should have been executed in ChatWithTools
	// Return empty string or a message indicating function calls were executed
	if len(resp.FunctionCalls) > 0 {
		// This shouldn't happen if ChatWithTools is working correctly
		// as it should continue until there's a final text response
		return "", fmt.Errorf("function calls were made but no final text response was generated")
	}

	return "", fmt.Errorf("langchain returned no text content and no function calls")
}

func (c *LangChainClient) ChatStream(ctx context.Context, hub *libraries.Hub, client *libraries.Client, boardId string, systemMessage string, messages []Message, enableThinking bool) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	// Create streaming context if client is provided
	var streamCtx *StreamingContext
	if client != nil {
		streamCtx = &StreamingContext{
			Hub:     hub,
			Client:  client,
			BoardId: boardId, // Can be empty string
			UserID:  client.UserID,
		}
	}
	resp, err := c.ChatWithTools(ctx, systemMessage, messages, streamCtx, enableThinking)
	if err != nil {
		return "", err
	}

	// If we have text content, return it
	if len(resp.TextContent) > 0 {
		return resp.TextContent[0], nil
	}

	// If we have function calls but no text, that's normal for function calling
	// The function calls should have been executed in ChatWithTools
	// Return empty string or a message indicating function calls were executed
	if len(resp.FunctionCalls) > 0 {
		// This shouldn't happen if ChatWithTools is working correctly
		// as it should continue until there's a final text response
		return "", fmt.Errorf("function calls were made but no final text response was generated")
	}

	return "", fmt.Errorf("langchain returned no text content and no function calls")
}

func (c *LangChainClient) ChatStreamWithUsage(req ChatStreamRequest) (*ResponseWithUsage, error) {
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
	var inputText string
	if client != nil {
		streamCtx = &StreamingContext{
			Hub:       hub,
			Client:    client,
			BoardId:   boardId,
			UserID:    client.UserID,
			LoaderGen: req.LoaderGen,
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
		return nil, fmt.Errorf("langchain returned no text content")
	}

	// Extract token usage from response
	tokenUsage := ExtractLangChainUsage(resp, inputText)

	return &ResponseWithUsage{
		Text:       resp.TextContent[0],
		TokenUsage: tokenUsage,
	}, nil
}

/*

To Add Thinking:

  opts := []llms.CallOption{}
  // ... existing options ...

  // Add thinking support
  opts = append(opts, llms.WithThinking(&llms.ThinkingConfig{
      Mode:               llms.ThinkingModeHigh,  // none, low, medium, high
      BudgetTokens:       10000,                   // OR explicit budget
      ReturnThinking:     true,                    // include in response
      StreamThinking:     true,                    // stream thinking tokens
      InterleaveThinking: true,                    // thinking between tool calls
  }))

  // OR use simpler options:
  opts = append(opts, llms.WithThinkingMode(llms.ThinkingModeHigh))
  opts = append(opts, llms.WithThinkingBudget(10000))
  opts = append(opts, llms.WithReturnThinking(true))
  opts = append(opts, llms.WithStreamThinking(true))

  Available Modes:
  ┌────────────────────┬────────────────────┐
  │        Mode        │    Description     │
  ├────────────────────┼────────────────────┤
  │ ThinkingModeNone   │ Disabled           │
  ├────────────────────┼────────────────────┤
  │ ThinkingModeLow    │ ~20% of max tokens │
  ├────────────────────┼────────────────────┤
  │ ThinkingModeMedium │ ~50% of max tokens │
  ├────────────────────┼────────────────────┤
  │ ThinkingModeHigh   │ ~80% of max tokens │
  └────────────────────┴────────────────────┘
  Supported Models (built-in detection):

  - OpenAI: o1, o3, GPT-5 series
  - Anthropic: Claude 3.7+
  - DeepSeek: reasoner models

*/
