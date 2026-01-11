package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/libraries"
	llmHandlers "melina-studio-backend/internal/llm_handlers"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"

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
			"description": "Retrieves the current board data as an image for a given board id. Returns the base64 encoded image of the board and a list of all shapes with their IDs and properties. Use this to see what shapes exist on the board before updating them.",
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
		{
			"name": "renameBoard",
			"description": "Renames a board by updating its title. Requires the board ID and the new name.",
			"input_schema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"boardId": map[string]interface{}{
						"type":        "string",
						"description": "The UUID of the board to rename (e.g., '123e4567-e89b-12d3-a456-426614174000')",
					},
					"newName": map[string]interface{}{
						"type":        "string",
						"description": "The new name/title for the board",
					},
				},
				"required": []string{"boardId", "newName"},
			},
		},
		{
			"name": "updateShape",
			"description": "Updates an existing shape on the board. Requires boardId and shapeId. All other properties are optional and only provided properties will be updated.",
			"input_schema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"boardId": map[string]interface{}{
						"type":        "string",
						"description": "The UUID of the board containing the shape",
					},
					"shapeId": map[string]interface{}{
						"type":        "string",
						"description": "The UUID of the shape to update",
					},
					"x": map[string]interface{}{
						"type":        "number",
						"description": "X coordinate (optional)",
					},
					"y": map[string]interface{}{
						"type":        "number",
						"description": "Y coordinate (optional)",
					},
					"width": map[string]interface{}{
						"type":        "number",
						"description": "Width (for rect, ellipse, optional)",
					},
					"height": map[string]interface{}{
						"type":        "number",
						"description": "Height (for rect, ellipse, optional)",
					},
					"radius": map[string]interface{}{
						"type":        "number",
						"description": "Radius (for circle, optional)",
					},
					"stroke": map[string]interface{}{
						"type":        "string",
						"description": "Stroke color (e.g., '#000000' or '#ff0000', optional)",
					},
					"fill": map[string]interface{}{
						"type":        "string",
						"description": "Fill color (e.g., '#ff0000' or 'transparent', optional)",
					},
					"strokeWidth": map[string]interface{}{
						"type":        "number",
						"description": "Stroke width (optional)",
					},
					"text": map[string]interface{}{
						"type":        "string",
						"description": "Text content (for text shapes, optional)",
					},
					"fontSize": map[string]interface{}{
						"type":        "number",
						"description": "Font size (for text shapes, optional)",
					},
					"fontFamily": map[string]interface{}{
						"type":        "string",
						"description": "Font family (for text shapes, optional)",
					},
					"points": map[string]interface{}{
						"type": "array",
						"items": map[string]interface{}{"type": "number"},
						"description": "Array of coordinates [x1, y1, x2, y2, ...] for line, arrow, polygon, or pencil (optional)",
					},
				},
				"required": []string{"boardId", "shapeId"},
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
				"description": "Retrieves the current board image for a given board ID. Returns the base64-encoded PNG image of the board and a list of all shapes with their IDs and properties. Use this to see what shapes exist on the board before updating them.",
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
		{
			"type": "function",
			"function": map[string]interface{}{
				"name":        "renameBoard",
				"description": "Renames a board by updating its title. Requires the board ID and the new name.",
				"parameters": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"boardId": map[string]interface{}{
							"type":        "string",
							"description": "The UUID of the board to rename (e.g., '123e4567-e89b-12d3-a456-426614174000')",
						},
						"newName": map[string]interface{}{
							"type":        "string",
							"description": "The new name/title for the board",
						},
					},
					"required": []string{"boardId", "newName"},
				},
			},
		},
		{
			"type": "function",
			"function": map[string]interface{}{
				"name":        "updateShape",
				"description": "Updates an existing shape on the board. Requires boardId and shapeId. All other properties are optional and only provided properties will be updated.",
				"parameters": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"boardId": map[string]interface{}{
							"type":        "string",
							"description": "The UUID of the board containing the shape",
						},
						"shapeId": map[string]interface{}{
							"type":        "string",
							"description": "The UUID of the shape to update",
						},
						"x": map[string]interface{}{
							"type":        "number",
							"description": "X coordinate (optional)",
						},
						"y": map[string]interface{}{
							"type":        "number",
							"description": "Y coordinate (optional)",
						},
						"width": map[string]interface{}{
							"type":        "number",
							"description": "Width (for rect, ellipse, optional)",
						},
						"height": map[string]interface{}{
							"type":        "number",
							"description": "Height (for rect, ellipse, optional)",
						},
						"radius": map[string]interface{}{
							"type":        "number",
							"description": "Radius (for circle, optional)",
						},
						"stroke": map[string]interface{}{
							"type":        "string",
							"description": "Stroke color (e.g., '#000000' or '#ff0000', optional)",
						},
						"fill": map[string]interface{}{
							"type":        "string",
							"description": "Fill color (e.g., '#ff0000' or 'transparent', optional)",
						},
						"strokeWidth": map[string]interface{}{
							"type":        "number",
							"description": "Stroke width (optional)",
						},
						"text": map[string]interface{}{
							"type":        "string",
							"description": "Text content (for text shapes, optional)",
						},
						"fontSize": map[string]interface{}{
							"type":        "number",
							"description": "Font size (for text shapes, optional)",
						},
						"fontFamily": map[string]interface{}{
							"type":        "string",
							"description": "Font family (for text shapes, optional)",
						},
						"points": map[string]interface{}{
							"type": "array",
							"items": map[string]interface{}{"type": "number"},
							"description": "Array of coordinates [x1, y1, x2, y2, ...] for line, arrow, polygon, or pencil (optional)",
						},
					},
					"required": []string{"boardId", "shapeId"},
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
// Also includes shape data with IDs so the LLM can identify shapes for updates
func GetBoardDataHandler(ctx context.Context, input map[string]interface{}) (interface{}, error) {
	boardId, ok := input["boardId"].(string)
	if !ok {
		return nil, fmt.Errorf("boardId is required")
	}
	
	// Get the image
	boardData, err := GetBoardData(boardId)
	if err != nil {
		return nil, fmt.Errorf("failed to get board data: %w", err)
	}
	
	// Get shape data from database
	boardIdUUID, err := uuid.Parse(boardId)
	if err != nil {
		return nil, fmt.Errorf("invalid boardId format: %w", err)
	}
	
	boardDataRepo := repo.NewBoardDataRepository(config.DB)
	shapesData, err := boardDataRepo.GetBoardData(boardIdUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to get shapes from database: %w", err)
	}
	
	// Convert BoardData to Shape format for the LLM
	shapes := make([]map[string]interface{}, 0, len(shapesData))
	for _, shapeData := range shapesData {
		// Parse the JSON data field
		var dataMap map[string]interface{}
		if err := json.Unmarshal(shapeData.Data, &dataMap); err != nil {
			// Skip shapes with invalid data
			continue
		}
		
		// Build shape object with ID
		shape := map[string]interface{}{
			"id":   shapeData.UUID.String(),
			"type": string(shapeData.Type),
		}
		
		// Copy all properties from dataMap
		for k, v := range dataMap {
			shape[k] = v
		}
		
		shapes = append(shapes, shape)
	}
	
	// Return a special structure that indicates this contains image content
	// The anthropic handler will detect this and format it as content blocks
	// Also include shapes array so LLM can see shape IDs
	return map[string]interface{}{
		"_imageContent": true,
		"boardId":       boardData["boardId"],
		"image":         boardData["image"],
		"format":        boardData["format"],
		"shapes":        shapes, // Include shape data with IDs
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

// RenameBoardHandler is the handler for the RenameBoard tool
func RenameBoardHandler(ctx context.Context, input map[string]interface{}) (interface{}, error) {
	boardIdStr , ok := input["boardId"].(string)
	if !ok {
		return nil, fmt.Errorf("boardId is required and must be a string")
	}
	boardId, err := uuid.Parse(boardIdStr)
	if err != nil {
		return nil, fmt.Errorf("invalid boardId: %w", err)
	}
	
	newName, ok := input["newName"].(string)
	if !ok {
		return nil, fmt.Errorf("newName is required and must be a string")
	}
	
	// Get StreamingContext from context
	streamCtxValue := ctx.Value("streamingContext")
	if streamCtxValue == nil {
		return nil, fmt.Errorf("streaming context not available - cannot send board renamed via WebSocket")
	}

	// Type assert to StreamingContext
	streamCtx, ok := streamCtxValue.(*llmHandlers.StreamingContext)
	if !ok {
		return nil, fmt.Errorf("invalid streaming context type")
	}

	// Access database via config and create repository
	boardRepo := repo.NewBoardRepository(config.DB)
	// Update the board
	updatePayload := &models.Board{
		Title: newName,
	}
	err = boardRepo.UpdateBoard(boardId, updatePayload)
	if err != nil {
		return nil, fmt.Errorf("failed to update board: %w", err)
	}

	// Send WebSocket event
	libraries.SendBoardRenamedMessage(streamCtx.Hub, streamCtx.Client, boardIdStr, newName)

	// Return success response
	return map[string]interface{}{
		"success": true,
		"boardId": boardIdStr,
		"newName": newName,
		"message": fmt.Sprintf("Board renamed successfully to '%s'", newName),
	}, nil
}

// UpdateShapeHandler is the handler for the updateShape tool
func UpdateShapeHandler(ctx context.Context, input map[string]interface{}) (interface{}, error) {
	// Validate input is not empty
	if len(input) == 0 {
		return nil, fmt.Errorf("tool input is empty - boardId and shapeId are required")
	}

	// Get StreamingContext from context
	streamCtxValue := ctx.Value("streamingContext")
	if streamCtxValue == nil {
		return nil, fmt.Errorf("streaming context not available - cannot send shape update via WebSocket")
	}

	// Type assert to StreamingContext
	streamCtx, ok := streamCtxValue.(*llmHandlers.StreamingContext)
	if !ok {
		return nil, fmt.Errorf("invalid streaming context type")
	}

	// Check if hub and client are available
	if streamCtx == nil || streamCtx.Hub == nil || streamCtx.Client == nil {
		return nil, fmt.Errorf("WebSocket connection not available - cannot send shape update")
	}

	// Validate and extract boardId
	boardIdStr, ok := input["boardId"].(string)
	if !ok || boardIdStr == "" {
		return nil, fmt.Errorf("boardId is required and must be a non-empty string")
	}

	boardId, err := uuid.Parse(boardIdStr)
	if err != nil {
		return nil, fmt.Errorf("invalid boardId format: %w", err)
	}

	// Validate and extract shapeId
	shapeIdStr, ok := input["shapeId"].(string)
	if !ok || shapeIdStr == "" {
		return nil, fmt.Errorf("shapeId is required and must be a non-empty string")
	}

	shapeId, err := uuid.Parse(shapeIdStr)
	if err != nil {
		return nil, fmt.Errorf("invalid shapeId format: %w", err)
	}

	// Create repository instance
	boardDataRepo := repo.NewBoardDataRepository(config.DB)

	// Retrieve all board data to find the shape
	boardDataList, err := boardDataRepo.GetBoardData(boardId)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve board data: %w", err)
	}

	// Find the shape by shapeId
	var existingBoardData *models.BoardData
	for i := range boardDataList {
		if boardDataList[i].UUID == shapeId {
			existingBoardData = &boardDataList[i]
			break
		}
	}

	if existingBoardData == nil {
		return nil, fmt.Errorf("shape with id %s not found on board", shapeIdStr)
	}

	// Parse existing shape data from JSON
	var existingDataMap map[string]interface{}
	if err := json.Unmarshal(existingBoardData.Data, &existingDataMap); err != nil {
		return nil, fmt.Errorf("failed to parse existing shape data: %w", err)
	}

	// Merge new properties with existing data (only update provided fields)
	if x, ok := input["x"].(float64); ok {
		existingDataMap["x"] = x
	}
	if y, ok := input["y"].(float64); ok {
		existingDataMap["y"] = y
	}
	if width, ok := input["width"].(float64); ok {
		existingDataMap["w"] = width
	}
	if height, ok := input["height"].(float64); ok {
		existingDataMap["h"] = height
	}
	if radius, ok := input["radius"].(float64); ok {
		existingDataMap["r"] = radius
	}
	if stroke, ok := input["stroke"].(string); ok && stroke != "" {
		existingDataMap["stroke"] = stroke
	}
	if fill, ok := input["fill"].(string); ok && fill != "" {
		existingDataMap["fill"] = fill
	}
	if strokeWidth, ok := input["strokeWidth"].(float64); ok {
		existingDataMap["strokeWidth"] = strokeWidth
	}
	if text, ok := input["text"].(string); ok {
		existingDataMap["text"] = text
	}
	if fontSize, ok := input["fontSize"].(float64); ok {
		existingDataMap["fontSize"] = fontSize
	}
	if fontFamily, ok := input["fontFamily"].(string); ok && fontFamily != "" {
		existingDataMap["fontFamily"] = fontFamily
	}
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
			existingDataMap["points"] = points
		}
	}

	// Convert merged data to models.Shape format
	shape := &models.Shape{
		ID:   shapeIdStr,
		Type: string(existingBoardData.Type),
	}

	// Helper functions to extract values
	getFloat := func(key string) *float64 {
		if v, ok := existingDataMap[key]; ok {
			if f, ok := v.(float64); ok {
				return &f
			}
		}
		return nil
	}

	getString := func(key string) *string {
		if v, ok := existingDataMap[key]; ok {
			if s, ok := v.(string); ok {
				return &s
			}
		}
		return nil
	}

	getFloatSlice := func(key string) *[]float64 {
		if v, ok := existingDataMap[key]; ok {
			if arr, ok := v.([]interface{}); ok {
				points := make([]float64, 0, len(arr))
				for _, p := range arr {
					switch val := p.(type) {
					case float64:
						points = append(points, val)
					case int:
						points = append(points, float64(val))
					case int64:
						points = append(points, float64(val))
					}
				}
				return &points
			}
			// Also handle []float64 directly
			if arr, ok := v.([]float64); ok {
				return &arr
			}
		}
		return nil
	}

	// Extract properties based on shape type
	shape.X = getFloat("x")
	shape.Y = getFloat("y")
	shape.Stroke = getString("stroke")
	shape.Fill = getString("fill")
	shape.StrokeWidth = getFloat("strokeWidth")

	switch shape.Type {
	case "rect", "ellipse":
		shape.W = getFloat("w")
		shape.H = getFloat("h")
	case "circle":
		shape.R = getFloat("r")
	case "line", "arrow", "polygon", "pencil":
		shape.Points = getFloatSlice("points")
	case "text":
		shape.Text = getString("text")
		shape.FontSize = getFloat("fontSize")
		shape.FontFamily = getString("fontFamily")
	}

	// Save updated shape to database
	err = boardDataRepo.SaveShapeData(boardId, shape)
	if err != nil {
		return nil, fmt.Errorf("failed to save updated shape: %w", err)
	}

	// Build shape map for WebSocket message (similar to addShape format)
	shapeMap := map[string]interface{}{
		"id":   shapeIdStr,
		"type": shape.Type,
	}

	if shape.X != nil {
		shapeMap["x"] = *shape.X
	}
	if shape.Y != nil {
		shapeMap["y"] = *shape.Y
	}
	if shape.W != nil {
		shapeMap["w"] = *shape.W
	}
	if shape.H != nil {
		shapeMap["h"] = *shape.H
	}
	if shape.R != nil {
		shapeMap["r"] = *shape.R
	}
	if shape.Stroke != nil {
		shapeMap["stroke"] = *shape.Stroke
	}
	if shape.Fill != nil {
		shapeMap["fill"] = *shape.Fill
	}
	if shape.StrokeWidth != nil {
		shapeMap["strokeWidth"] = *shape.StrokeWidth
	}
	if shape.Points != nil {
		shapeMap["points"] = *shape.Points
	}
	if shape.Text != nil {
		shapeMap["text"] = *shape.Text
	}
	if shape.FontSize != nil {
		shapeMap["fontSize"] = *shape.FontSize
	}
	if shape.FontFamily != nil {
		shapeMap["fontFamily"] = *shape.FontFamily
	}

	// Send WebSocket message
	libraries.SendShapeUpdatedMessage(streamCtx.Hub, streamCtx.Client, boardIdStr, shapeMap)

	// Return success response
	return map[string]interface{}{
		"success": true,
		"shapeId": shapeIdStr,
		"message": fmt.Sprintf("Successfully updated %s shape", shape.Type),
		"shape":   shapeMap,
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

	llmHandlers.RegisterTool("renameBoard", func(ctx context.Context, input map[string]interface{}) (interface{}, error) {
		return RenameBoardHandler(ctx, input)
	})

	llmHandlers.RegisterTool("updateShape", func(ctx context.Context, input map[string]interface{}) (interface{}, error) {
		return UpdateShapeHandler(ctx, input)
	})
}