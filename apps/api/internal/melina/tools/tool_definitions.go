package tools

import (
	"context"
	"fmt"
	"melina-studio-backend/internal/libraries"
	llmHandlers "melina-studio-backend/internal/llm_handlers"

	"github.com/google/uuid"
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
		{
			"name": "addShape",
			"description": "Adds a shape to the board in react konva format. Supports rect, circle, line, arrow, ellipse, polygon, text, and pencil. For complex shapes like animals, break them down into multiple basic shapes. The shape will appear on the board immediately.",
			"input_schema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"boardId": map[string]interface{}{
						"type":        "string",
						"description": "The UUID of the board to add the shape to",
					},
					"shapeType": map[string]interface{}{
						"type": "string",
						"enum": []string{"rect", "circle", "line", "arrow", "ellipse", "polygon", "text", "pencil"},
						"description": "Type of shape to create",
					},
					"x": map[string]interface{}{
						"type":        "number",
						"description": "X coordinate (required for most shapes)",
					},
					"y": map[string]interface{}{
						"type":        "number",
						"description": "Y coordinate (required for most shapes)",
					},
					"width": map[string]interface{}{
						"type":        "number",
						"description": "Width (for rect, ellipse)",
					},
					"height": map[string]interface{}{
						"type":        "number",
						"description": "Height (for rect, ellipse)",
					},
					"radius": map[string]interface{}{
						"type":        "number",
						"description": "Radius (for circle)",
					},
					"stroke": map[string]interface{}{
						"type":        "string",
						"description": "Stroke color (e.g., '#000000' or '#ff0000')",
					},
					"fill": map[string]interface{}{
						"type":        "string",
						"description": "Fill color (e.g., '#ff0000' or 'transparent')",
					},
					"strokeWidth": map[string]interface{}{
						"type":        "number",
						"description": "Stroke width (default: 2)",
					},
					"text": map[string]interface{}{
						"type":        "string",
						"description": "Text content (for text shapes)",
					},
					"fontSize": map[string]interface{}{
						"type":        "number",
						"description": "Font size (for text shapes, default: 16)",
					},
					"fontFamily": map[string]interface{}{
						"type":        "string",
						"description": "Font family (for text shapes, default: 'Arial')",
					},
					"points": map[string]interface{}{
						"type": "array",
						"items": map[string]interface{}{"type": "number"},
						"description": "Array of coordinates [x1, y1, x2, y2, ...] for line, arrow, polygon, or pencil",
					},
				},
				"required": []string{"boardId", "shapeType", "x", "y"},
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
		{
			"type": "function",
			"function": map[string]interface{}{
				"name":        "addShape",
				"description": "Adds a shape to the board in react konva format. Supports rect, circle, line, arrow, ellipse, polygon, text, and pencil. For complex shapes like animals, break them down into multiple basic shapes. The shape will appear on the board immediately.",
				"parameters": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"boardId": map[string]interface{}{
							"type":        "string",
							"description": "The UUID of the board to add the shape to",
						},
						"shapeType": map[string]interface{}{
							"type": "string",
							"enum": []string{"rect", "circle", "line", "arrow", "ellipse", "polygon", "text", "pencil"},
							"description": "Type of shape to create",
						},
						"x": map[string]interface{}{
							"type":        "number",
							"description": "X coordinate (required for most shapes)",
						},
						"y": map[string]interface{}{
							"type":        "number",
							"description": "Y coordinate (required for most shapes)",
						},
						"width": map[string]interface{}{
							"type":        "number",
							"description": "Width (for rect, ellipse)",
						},
						"height": map[string]interface{}{
							"type":        "number",
							"description": "Height (for rect, ellipse)",
						},
						"radius": map[string]interface{}{
							"type":        "number",
							"description": "Radius (for circle)",
						},
						"stroke": map[string]interface{}{
							"type":        "string",
							"description": "Stroke color (e.g., '#000000' or '#ff0000')",
						},
						"fill": map[string]interface{}{
							"type":        "string",
							"description": "Fill color (e.g., '#ff0000' or 'transparent')",
						},
						"strokeWidth": map[string]interface{}{
							"type":        "number",
							"description": "Stroke width (default: 2)",
						},
						"text": map[string]interface{}{
							"type":        "string",
							"description": "Text content (for text shapes)",
						},
						"fontSize": map[string]interface{}{
							"type":        "number",
							"description": "Font size (for text shapes, default: 16)",
						},
						"fontFamily": map[string]interface{}{
							"type":        "string",
							"description": "Font family (for text shapes, default: 'Arial')",
						},
						"points": map[string]interface{}{
							"type": "array",
							"items": map[string]interface{}{"type": "number"},
							"description": "Array of coordinates [x1, y1, x2, y2, ...] for line, arrow, polygon, or pencil",
						},
					},
					"required": []string{"boardId", "shapeType", "x", "y"},
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

// AddShapeHandler is the handler for the AddShape tool
// Returns a map with special key "_shapeContent" that will be formatted as shape content blocks
func AddShapeHandler(ctx context.Context, input map[string]interface{}) (interface{}, error) {
	// Validate input is not empty
	if len(input) == 0 {
		return nil, fmt.Errorf("tool input is empty - boardId, shapeType, x, and y are required")
	}

	// Get StreamingContext from context
	streamCtxValue := ctx.Value("streamingContext")
	if streamCtxValue == nil {
		return nil, fmt.Errorf("streaming context not available - cannot send shape via WebSocket")
	}

	// Type assert to StreamingContext
	streamCtx, ok := streamCtxValue.(*llmHandlers.StreamingContext)
	if !ok {
		return nil, fmt.Errorf("invalid streaming context type")
	}

	// Check if hub and client are available
	if streamCtx == nil || streamCtx.Hub == nil || streamCtx.Client == nil {
		return nil, fmt.Errorf("WebSocket connection not available - cannot send shape")
	}

	boardId, ok := input["boardId"].(string)
	if !ok || boardId == "" {
		return nil, fmt.Errorf("boardId is required and must be a non-empty string")
	}

	shapeType, ok := input["shapeType"].(string)
	if !ok || shapeType == "" {
		return nil, fmt.Errorf("shapeType is required and must be a string")
	}
	
	// validate shape type
	validateTypes := map[string]bool{
		"rect": true,
		"circle": true,
		"line": true,
		"arrow": true,
		"ellipse": true,
		"polygon": true,
		"text": true,
		"pencil": true,
	}
	if !validateTypes[shapeType] {
		return nil, fmt.Errorf("invalid shape type: %s", shapeType)
	}

	// Extract and validate coordinates
	x, ok := input["x"].(float64)
	if !ok {
		return nil, fmt.Errorf("x coordinate is required and must be a number")
	}
	y, ok := input["y"].(float64)
	if !ok {
		return nil, fmt.Errorf("y coordinate is required and must be a number")
	}
	
	// build shape object
	shape := map[string]interface{}{
		"id": uuid.New().String(),
		"type": shapeType,
		"x": x,
		"y": y,
	}

	// add shape-specific properties
	switch shapeType {
	case "rect", "ellipse":
		if width, ok := input["width"].(float64); ok {
			shape["w"] = width
		}
		if height, ok := input["height"].(float64); ok {
			shape["h"] = height
		}
	case "circle":
		if radius, ok := input["radius"].(float64); ok {
			shape["r"] = radius
		}
	case "line", "arrow", "polygon", "pencil":
		// Points come as []interface{} from JSON, need to convert to []float64
		if pointsRaw, ok := input["points"].([]interface{}); ok && len(pointsRaw) > 0 {
			points := make([]float64, 0, len(pointsRaw))
			for _, p := range pointsRaw {
				switch v := p.(type) {
				case float64:
					points = append(points, v)
				case int:
					points = append(points, float64(v))
				case int64:
					points = append(points, float64(v))
				}
			}
			if len(points) > 0 {
				shape["points"] = points
			}
		}
	case "text":
		if text, ok := input["text"].(string); ok && text != "" {
			shape["text"] = text
		}
		if fontSize, ok := input["fontSize"].(float64); ok {
			shape["fontSize"] = fontSize
		}
		if fontFamily, ok := input["fontFamily"].(string); ok && fontFamily != "" {
			shape["fontFamily"] = fontFamily
		}
	}

	// Add styling properties (optional)
	if stroke, ok := input["stroke"].(string); ok && stroke != "" {
		shape["stroke"] = stroke
	}
	if fill, ok := input["fill"].(string); ok && fill != "" {
		shape["fill"] = fill
	}
	if strokeWidth, ok := input["strokeWidth"].(float64); ok {
		shape["strokeWidth"] = strokeWidth
	}



	// Emit WebSocket event
	libraries.SendShapeCreatedMessage(streamCtx.Hub, streamCtx.Client, boardId, shape)

	// Return success response
	return map[string]interface{}{
		"success":  true,
		"shapeId":  shape["id"],
		"message":  fmt.Sprintf("Successfully created %s shape at (%.2f, %.2f)", shapeType, x, y),
		"shape":    shape,
	}, nil
}

// RegisterAllTools registers all tools with the toolHandlers registry
func RegisterAllTools() {
	llmHandlers.RegisterTool("getBoardData", func(ctx context.Context, input map[string]interface{}) (interface{}, error) {
		return GetBoardDataHandler(ctx, input)
	})

	llmHandlers.RegisterTool("addShape", func(ctx context.Context, input map[string]interface{}) (interface{}, error) {
		return AddShapeHandler(ctx, input)
	})
}