package llmHandlers

import (
	"context"
	"encoding/json"
	"fmt"
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
func ExecuteTools(ctx context.Context, toolCalls []ToolCall) []ToolExecutionResult {
	results := make([]ToolExecutionResult, 0, len(toolCalls))

	for _, tc := range toolCalls {
		result := ToolExecutionResult{
			ToolCallID: tc.ID,
			ToolName:   tc.Name,
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

		// Execute handler
		execResult, err := handler(ctx, input)
		if err != nil {
			result.Error = err
			results = append(results, result)
			fmt.Printf("[%s] ERROR: %v\n", tc.Provider, err)
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
		return map[string]interface{}{
			"type":        "tool_result",
			"tool_use_id": result.ToolCallID,
			"content":     fmt.Sprintf("Error: %v", result.Error),
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
