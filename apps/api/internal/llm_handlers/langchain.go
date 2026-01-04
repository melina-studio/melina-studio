package llmHandlers

import (
	"context"
	"encoding/json"
	"fmt"
	"melina-studio-backend/internal/libraries"
	"reflect"
	"strings"
	"time"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
)

type LangChainClient struct {
	llm   llms.Model
	Tools []map[string]interface{}
}

// StreamingContext holds the context needed for streaming responses
type StreamingContext struct {
	Hub     *libraries.Hub
	Client  *libraries.Client
	BoardId string // Optional: empty string means don't include boardId in response
	// BufferedChunks stores chunks that should be sent only if there are no tool calls
	BufferedChunks []string
	// ShouldStream indicates whether chunks should be streamed immediately or buffered
	ShouldStream bool
}

type LangChainConfig struct {
	Model   string                 // e.g. "gpt-4.1", "llama-3.1-70b-versatile"
	BaseURL string                 // optional: for Groq or other OpenAI-compatible APIs
	APIKey  string                 // if not set, it'll fall back to env
	Tools   []map[string]interface{} // Tool definitions in OpenAI format
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
		llm:   llm,
		Tools: cfg.Tools,
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
					// Handle function call from assistant
					// Note: langchaingo may handle this differently, we'll parse from response instead
					if fn, ok := block["function"].(map[string]interface{}); ok {
						name, _ := fn["name"].(string)
						arguments, _ := fn["arguments"].(map[string]interface{})
						argsJSON, _ := json.Marshal(arguments)
						// Convert to text representation for now
						parts = append(parts, llms.TextPart(fmt.Sprintf("Function call: %s with args: %s", name, string(argsJSON))))
					}

				case "function_response":
					// Handle function response (tool result)
					// Note: langchaingo may handle this differently, we'll format as text for now
					if fn, ok := block["function"].(map[string]interface{}); ok {
						name, _ := fn["name"].(string)
						responseStr, _ := fn["response"].(string)
						parts = append(parts, llms.TextPart(fmt.Sprintf("Function response for %s: %s", name, responseStr)))
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
func (c *LangChainClient) callLangChainWithMessages(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext) (*LangChainResponse, error) {
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
	if len(langChainTools) > 0 {
		// WithFunctions expects a single slice, not variadic
		opts = append(opts, llms.WithFunctions(langChainTools))

		// Enable streaming if streaming context is provided
		if streamCtx != nil && streamCtx.Client != nil {
			opts = append(opts, llms.WithStreamingFunc(streamingFunc))
		}
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

	return lr, nil
}

// ChatWithTools handles tool execution loop similar to Anthropic's and Gemini's implementation
func (c *LangChainClient) ChatWithTools(ctx context.Context, systemMessage string, messages []Message, streamCtx *StreamingContext) (*LangChainResponse, error) {
	const maxIterations = 8

	workingMessages := make([]Message, 0, len(messages)+6)
	workingMessages = append(workingMessages, messages...)

	var lastResp *LangChainResponse
	for iter := 0; iter < maxIterations; iter++ {
		// Prepare streaming context for this iteration
		var currentStreamCtx *StreamingContext
		if streamCtx != nil && streamCtx.Client != nil {
			// Create a copy to avoid modifying the original
			currentStreamCtx = &StreamingContext{
				Hub:            streamCtx.Hub,
				Client:         streamCtx.Client,
				BoardId:        streamCtx.BoardId,
				BufferedChunks: make([]string, 0),
				ShouldStream:   false, // Start with buffering - we'll decide after the call
			}
		}
		
		// Make the call with streaming enabled (but buffered)
		lr, err := c.callLangChainWithMessages(ctx, systemMessage, workingMessages, currentStreamCtx)
		if err != nil {
			return nil, fmt.Errorf("callLangChainWithMessages: %w", err)
		}
		lastResp = lr

		// If no function calls, this is the final iteration - send buffered chunks
		if len(lr.FunctionCalls) == 0 {
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

		// Append assistant message with function calls
		assistantParts := []map[string]interface{}{}
		for _, text := range lr.TextContent {
			assistantParts = append(assistantParts, map[string]interface{}{
				"type": "text",
				"text": text,
			})
		}
		for _, fc := range lr.FunctionCalls {
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

	return lastResp, fmt.Errorf("max iterations reached (%d) while resolving tools", maxIterations)
}

func (c *LangChainClient) Chat(ctx context.Context, systemMessage string, messages []Message) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	// No streaming context for regular Chat
	resp, err := c.ChatWithTools(ctx, systemMessage, messages, nil)
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

func (c *LangChainClient) ChatStream(ctx context.Context, hub *libraries.Hub, client *libraries.Client, boardId string, systemMessage string, messages []Message) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	// Create streaming context if client is provided
	var streamCtx *StreamingContext
	if client != nil {
		streamCtx = &StreamingContext{
			Hub:     hub,
			Client:  client,
			BoardId: boardId, // Can be empty string
		}
	}
	resp, err := c.ChatWithTools(ctx, systemMessage, messages, streamCtx)
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

/*

func initLangChain() llm.Client {
	cfg := llm.LangChainConfig{
		Model:   "gpt-4.1",
		BaseURL: "", // set for Groq/GPT-compatible endpoints
		APIKey:  "", // optional: falls back to env
	}
	client, err := llm.NewLangChainClient(cfg)
	if err != nil {
		log.Fatalf("langchain client init: %v", err)
	}
	return client
}

*/
