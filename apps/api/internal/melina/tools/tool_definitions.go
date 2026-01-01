package tools

import (
	"context"
	"fmt"
	llmHandlers "melina-studio-backend/internal/llm_handlers"
)

func init() {
	RegisterAllTools()
}

// get anthropic tools returns
func GetAnthropicTools() []map[string]interface{} {
	return []map[string]interface{}{
		{
			"name": "getBoardData",
			"description": "Retrives the current board data as an image for a given board id. Returns the base64 encoded image of the board.",
			"input_schema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"boardId": map[string]interface{}{
						"type": "string",
						"description": "The uuid of the board to get the data (e.g., '123e4567-e89b-12d3-a456-426614174000')",
					},
				},
				"required": []string{"boardId"},
			},
		},
	}
}

func GetOpenAITools() []map[string]interface{} {
	return []map[string]interface{}{
		{
			"type": "function",
			"function": map[string]interface{}{
				"name":        "getBoardData",
				"description": "Retrieves the current board image for a given board ID. Returns the base64-encoded PNG image of the board.",
				"parameters": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"boardId": map[string]interface{}{
							"type":        "string",
							"description": "The UUID of the board to retrieve (e.g., '123e4567-e89b-12d3-a456-426614174000')",
						},
					},
					"required": []string{"boardId"},
				},
			},
		},
	}
}

// GetGeminiTools returns tool definitions in Gemini function calling format
func GetGeminiTools() []map[string]interface{} {
	return GetOpenAITools()
}

// Groq tool format is the same as OpenAI's
func GetGroqTools() []map[string]interface{} {
	return GetOpenAITools()
}

// GetBoardDataHandler is the handler for the GetBoardData tool
// Returns a map with special key "_imageContent" that will be formatted as image content blocks
func GetBoardDataHandler(ctx context.Context, input map[string]interface{}) (interface{}, error) {
	boardId, ok := input["boardId"].(string)
	if !ok {
		return nil, fmt.Errorf("boardId is required")
	}
	boardData, err := GetBoardData(boardId)
	if err != nil {
		return nil, fmt.Errorf("failed to get board data: %w", err)
	}
	
	// Return a special structure that indicates this contains image content
	// The anthropic handler will detect this and format it as content blocks
	return map[string]interface{}{
		"_imageContent": true,
		"boardId":       boardData["boardId"],
		"image":         boardData["image"],
		"format":        boardData["format"],
	}, nil
}

// RegisterAllTools registers all tools with the toolHandlers registry
func RegisterAllTools() {
	llmHandlers.RegisterTool("getBoardData", func(ctx context.Context, input map[string]interface{}) (interface{}, error) {
		return GetBoardDataHandler(ctx, input)
	})
}