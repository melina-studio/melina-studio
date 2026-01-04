package llmHandlers

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
)

// ToolHandler is the function signature for tool handlers.
// Input is the tool input as map[string]interface{} and it returns any result or an error.
type ToolHandler func(ctx context.Context, input map[string]interface{}) (interface{}, error)

// toolHandlers is the registry that maps tool name -> handler.
var (
	toolHandlersMu sync.RWMutex
	toolHandlers   = make(map[string]ToolHandler)
)

// RegisterTool registers a ToolHandler under the given name.
// If a handler already exists, it will be overwritten.
func RegisterTool(name string, h ToolHandler) {
	toolHandlersMu.Lock()
	defer toolHandlersMu.Unlock()
	toolHandlers[name] = h
}

// UnregisterTool removes a registered tool handler.
func UnregisterTool(name string) {
	toolHandlersMu.Lock()
	defer toolHandlersMu.Unlock()
	delete(toolHandlers, name)
}

// getToolHandler returns a handler and a boolean indicating presence.
func getToolHandler(name string) (ToolHandler, bool) {
	toolHandlersMu.RLock()
	defer toolHandlersMu.RUnlock()
	h, ok := toolHandlers[name]
	return h, ok
}

// ToolCall represents a generic tool call that can be used across providers
type ToolCall struct {
	ID      string                 // Tool call ID (for Anthropic) or empty (for Gemini)
	Name    string                 // Tool/function name
	Input   map[string]interface{} // Tool input arguments
	Provider string                // Provider name for logging/debugging
}

// ToolExecutionResult represents the result of executing a tool
type ToolExecutionResult struct {
	ToolCallID string                 // Original tool call ID (if applicable)
	ToolName   string                 // Tool name
	Result     interface{}            // The actual result from the handler
	Error      error                  // Error if execution failed
	HasImage   bool                   // Whether result contains image content
	ImageData  *ImageContent          // Image data if HasImage is true
}

// ImageContent contains image data extracted from tool results
type ImageContent struct {
	BoardID   string
	ImageBase64 string
	Format    string
	MediaType string
}

// ExecuteTools executes a batch of tool calls and returns results
func ExecuteTools(ctx context.Context, toolCalls []ToolCall , streamCtx *StreamingContext) []ToolExecutionResult {
	results := make([]ToolExecutionResult, 0, len(toolCalls))

	// Pass StreamingContext through context if available
	if streamCtx != nil {
		ctx = context.WithValue(ctx, "streamingContext", streamCtx)
	}

	for _, tc := range toolCalls {
		result := ToolExecutionResult{
			ToolCallID: tc.ID,
			ToolName:   tc.Name,
		}

		// Handle empty input (streaming artifact) - return error result instead of skipping
		// This is important because Claude requires a tool_result for every tool_use
		if len(tc.Input) == 0 {
			result.Error = fmt.Errorf("tool input was empty (streaming artifact) - please retry with valid parameters")
			results = append(results, result)
			fmt.Printf("[%s] EMPTY INPUT for tool %s (id=%s) - returning error result\n", tc.Provider, tc.Name, tc.ID)
			continue
		}

		// Find handler
		handler, ok := getToolHandler(tc.Name)
		if !ok {
			result.Error = fmt.Errorf("unknown tool: %s", tc.Name)
			results = append(results, result)
			fmt.Printf("[%s] UNKNOWN TOOL: %s\n", tc.Provider, tc.Name)
			continue
		}

		// Ensure input is map[string]interface{}
		input := make(map[string]interface{})
		if tc.Input != nil {
			for k, v := range tc.Input {
				input[k] = v
			}
		}

		fmt.Printf("[%s] executing tool: %s", tc.Provider, tc.Name)
		if tc.ID != "" {
			fmt.Printf(" (id=%s)", tc.ID)
		}
		fmt.Printf(" with input=%#v\n", input)

		// Execute handler with panic recovery
		var execResult interface{}
		var handlerErr error
		func() {
			defer func() {
				if r := recover(); r != nil {
					handlerErr = fmt.Errorf("tool execution panicked: %v", r)
					fmt.Printf("[%s] PANIC in tool %s: %v\n", tc.Provider, tc.Name, r)
				}
			}()
			
			execResult, handlerErr = handler(ctx, input)
		}()
		
		// Handle errors (but don't stop the workflow - continue with other tools)
		if handlerErr != nil {
			result.Error = handlerErr
			results = append(results, result)
			fmt.Printf("[%s] ERROR in tool %s: %v (continuing with other tools)\n", tc.Provider, tc.Name, handlerErr)
			continue
		}

		result.Result = execResult

		// Check if result contains image content
		if resultMap, ok := execResult.(map[string]interface{}); ok {
			if hasImage, _ := resultMap["_imageContent"].(bool); hasImage {
				result.HasImage = true
				imageBase64, _ := resultMap["image"].(string)
				boardId, _ := resultMap["boardId"].(string)
				format, _ := resultMap["format"].(string)

				mediaType := "image/png"
				if format != "" {
					mediaType = fmt.Sprintf("image/%s", format)
				}

				result.ImageData = &ImageContent{
					BoardID:     boardId,
					ImageBase64: imageBase64,
					Format:      format,
					MediaType:   mediaType,
				}
			}
		}

		results = append(results, result)
	}

	return results
}

// FormatAnthropicToolResult formats a ToolExecutionResult for Anthropic's API
func FormatAnthropicToolResult(result ToolExecutionResult) map[string]interface{} {
	if result.Error != nil {
		// Create a helpful error message for the LLM
		errorMsg := fmt.Sprintf("Tool execution failed: %v. Please check the input parameters and try again. The tool '%s' requires valid parameters.", result.Error, result.ToolName)
		
		// Add specific guidance based on error type
		if strings.Contains(result.Error.Error(), "boardId") {
			errorMsg += " Make sure boardId is provided and is a valid UUID string."
		} else if strings.Contains(result.Error.Error(), "shapeType") {
			errorMsg += " Make sure shapeType is one of: rect, circle, line, arrow, ellipse, polygon, text, pencil."
		} else if strings.Contains(result.Error.Error(), "points") {
			errorMsg += " For line/arrow/polygon/pencil shapes, provide a 'points' array with coordinates [x1, y1, x2, y2, ...]."
		} else if strings.Contains(result.Error.Error(), "empty") {
			errorMsg += " The tool input was empty. Please provide all required parameters: boardId, shapeType, x, y."
		}
		
		return map[string]interface{}{
			"type":        "tool_result",
			"tool_use_id": result.ToolCallID,
			"content":     errorMsg,
			"is_error":    true,
		}
	}

	var content interface{}

	if result.HasImage && result.ImageData != nil {
		// Format as array of content blocks (text + image) for Anthropic
		content = []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Board image for boardId: %s", result.ImageData.BoardID),
			},
			{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": result.ImageData.MediaType,
					"data":       result.ImageData.ImageBase64,
				},
			},
		}
	} else if resultMap, ok := result.Result.(map[string]interface{}); ok {
		// Regular result - convert to string
		b, _ := json.Marshal(resultMap)
		content = string(b)
	} else {
		// Regular string result
		content = fmt.Sprintf("%v", result.Result)
	}

	return map[string]interface{}{
		"type":        "tool_result",
		"tool_use_id": result.ToolCallID,
		"content":     content,
	}
}

// FormatGeminiToolResult formats a ToolExecutionResult for Gemini's API
// Returns both the function response and optional image content blocks
func FormatGeminiToolResult(result ToolExecutionResult) (functionResponse map[string]interface{}, imageBlocks []map[string]interface{}) {
	imageBlocks = []map[string]interface{}{}

	if result.Error != nil {
		resultJSON, _ := json.Marshal(map[string]string{"error": result.Error.Error()})
		return map[string]interface{}{
			"type": "function_response",
			"function": map[string]interface{}{
				"name":     result.ToolName,
				"response": string(resultJSON),
			},
		}, imageBlocks
	}

	var resultJSON []byte

	if result.HasImage && result.ImageData != nil {
		// Return metadata in function response
		metadata := map[string]interface{}{
			"boardId": result.ImageData.BoardID,
			"format":  result.ImageData.Format,
			"message": fmt.Sprintf("Board image retrieved for boardId: %s", result.ImageData.BoardID),
		}
		resultJSON, _ = json.Marshal(metadata)

		// Store image as content blocks to add separately
		imageBlocks = append(imageBlocks,
			map[string]interface{}{
				"type": "text",
				"text": fmt.Sprintf("Board image for boardId: %s", result.ImageData.BoardID),
			},
			map[string]interface{}{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": result.ImageData.MediaType,
					"data":       result.ImageData.ImageBase64,
				},
			},
		)
	} else if resultMap, ok := result.Result.(map[string]interface{}); ok {
		resultJSON, _ = json.Marshal(resultMap)
	} else {
		resultJSON, _ = json.Marshal(result.Result)
	}

	return map[string]interface{}{
		"type": "function_response",
		"function": map[string]interface{}{
			"name":     result.ToolName,
			"response": string(resultJSON),
		},
	}, imageBlocks
}

// FormatLangChainToolResult formats a ToolExecutionResult for LangChain's API (OpenAI-compatible)
// Returns both the function response and optional image content blocks
func FormatLangChainToolResult(result ToolExecutionResult) (functionResponse map[string]interface{}, imageBlocks []map[string]interface{}) {
	imageBlocks = []map[string]interface{}{}

	if result.Error != nil {
		resultJSON, _ := json.Marshal(map[string]string{"error": result.Error.Error()})
		return map[string]interface{}{
			"type": "function_response",
			"function": map[string]interface{}{
				"name":     result.ToolName,
				"response": string(resultJSON),
			},
		}, imageBlocks
	}

	var resultJSON []byte

	if result.HasImage && result.ImageData != nil {
		// Return metadata in function response
		metadata := map[string]interface{}{
			"boardId": result.ImageData.BoardID,
			"format":  result.ImageData.Format,
			"message": fmt.Sprintf("Board image retrieved for boardId: %s", result.ImageData.BoardID),
		}
		resultJSON, _ = json.Marshal(metadata)

		// Store image as content blocks to add separately
		imageBlocks = append(imageBlocks,
			map[string]interface{}{
				"type": "text",
				"text": fmt.Sprintf("Board image for boardId: %s", result.ImageData.BoardID),
			},
			map[string]interface{}{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": result.ImageData.MediaType,
					"data":       result.ImageData.ImageBase64,
				},
			},
		)
	} else if resultMap, ok := result.Result.(map[string]interface{}); ok {
		resultJSON, _ = json.Marshal(resultMap)
	} else {
		resultJSON, _ = json.Marshal(result.Result)
	}

	return map[string]interface{}{
		"type": "function_response",
		"function": map[string]interface{}{
			"name":     result.ToolName,
			"response": string(resultJSON),
		},
	}, imageBlocks
}
