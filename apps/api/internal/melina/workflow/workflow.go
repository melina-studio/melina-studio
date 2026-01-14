package workflow

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/alpkeskin/gotoon"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/melina/agents"
	"melina-studio-backend/internal/melina/tools"
	"melina-studio-backend/internal/repo"
)

// ImageContent represents a fetched and encoded image
type ImageContent struct {
	ShapeId  string
	MimeType string
	Data     string // base64 encoded
}

// fetchAndEncodeImages fetches images from GCP URLs and converts them to base64
func fetchAndEncodeImages(urls []libraries.ShapeImageUrl) ([]ImageContent, error) {
	var images []ImageContent
	for _, url := range urls {
		resp, err := http.Get(url.Url)
		if err != nil {
			log.Printf("Failed to fetch image for shape %s: %v", url.ShapeId, err)
			continue // Skip failed images instead of failing entirely
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			log.Printf("Failed to fetch image for shape %s: status %d", url.ShapeId, resp.StatusCode)
			continue
		}

		data, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Failed to read image data for shape %s: %v", url.ShapeId, err)
			continue
		}

		base64Data := base64.StdEncoding.EncodeToString(data)
		images = append(images, ImageContent{
			ShapeId:  url.ShapeId,
			MimeType: "image/png",
			Data:     base64Data,
		})
	}
	return images, nil
}


type Workflow struct {
	chatRepo      repo.ChatRepoInterface
	boardDataRepo repo.BoardDataRepoInterface
}

func NewWorkflow(chatRepo repo.ChatRepoInterface, boardDataRepo repo.BoardDataRepoInterface) *Workflow {
	return &Workflow{chatRepo: chatRepo, boardDataRepo: boardDataRepo}
}

func (w *Workflow) TriggerChatWorkflow(c *fiber.Ctx) error {
	// Extract boardId from route params
	boardId := c.Params("boardId")
	// convert boardId to uuid
	boardUUID, err := uuid.Parse(boardId)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid board ID: %v", err),
		})
	}
	var dto struct {
		Message string `json:"message"`
	}

	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid request body: %v", err),
		})
	}

	if dto.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Message cannot be empty: %v", err),
		})
	}

	// Default to gemini if not specified
	LLM := "groq"
	temperature := float32(0.2)
	maxTokens := 1024

	// Create agent on-demand with specified LLM provider
	agent := agents.NewAgent(LLM, &temperature, &maxTokens)

	// get chat history from the database
	chatHistory, err := w.chatRepo.GetChatHistory(boardUUID, 20)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to get chat history: %v", err),
		})
	}


	// Call the agent to process the message with boardId (for image context)
	aiResponse, err := agent.ProcessRequest(c.Context(), dto.Message , chatHistory, boardId)
	if err != nil {
		log.Printf("Error processing request: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to process message: %v", err),
		})
	}

	// after get successful response, create a chat in the database
	human_message_id , ai_message_id , err := w.chatRepo.CreateHumanAndAiMessages(boardUUID, dto.Message, aiResponse)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to create human and ai messages: %v", err),
		})
	}

	return c.JSON(fiber.Map{
		"message": aiResponse,
		"human_message_id": human_message_id.String(),
		"ai_message_id": ai_message_id.String(),
	})
}

func (w *Workflow) ProcessChatMessage(hub *libraries.Hub, client *libraries.Client, cfg *libraries.WorkflowConfig) {
	// get chat history from the database
	boardIdUUID, err := uuid.Parse(cfg.BoardId)
	if err != nil {
		libraries.SendErrorMessage(hub, client, "Invalid board ID")
		return
	}

	// get chat history from the database
	chatHistory, err := w.chatRepo.GetChatHistory(boardIdUUID, 20)
	if err != nil {
		libraries.SendErrorMessage(hub, client, "Failed to get chat history")
		return
	}

	// create an agent
	LLM := cfg.Model
	agent := agents.NewAgent(LLM, cfg.Temperature, cfg.MaxTokens)

	// Process selection images: fetch, annotate, and format with gotoon
	var annotatedSelections []agents.AnnotatedSelection
	if cfg.Message.Metadata != nil && len(cfg.Message.Metadata.ShapeImageUrls) > 0 {
		log.Printf("Processing %d shape selections", len(cfg.Message.Metadata.ShapeImageUrls))

		// Step 1: Group shapes by image URL (shapes in same selection share URL)
		type selectionGroup struct {
			url     string
			bounds  *libraries.SelectionBounds
			shapes  []libraries.ShapeImageUrl
		}
		urlToGroup := make(map[string]*selectionGroup)
		for _, shapeUrl := range cfg.Message.Metadata.ShapeImageUrls {
			if group, exists := urlToGroup[shapeUrl.Url]; exists {
				group.shapes = append(group.shapes, shapeUrl)
			} else {
				urlToGroup[shapeUrl.Url] = &selectionGroup{
					url:    shapeUrl.Url,
					bounds: shapeUrl.Bounds,
					shapes: []libraries.ShapeImageUrl{shapeUrl},
				}
			}
		}

		// Step 2: Collect all shape UUIDs and fetch from DB
		var allShapeUUIDs []uuid.UUID
		for _, shapeUrl := range cfg.Message.Metadata.ShapeImageUrls {
			if shapeUUID, err := uuid.Parse(shapeUrl.ShapeId); err == nil {
				allShapeUUIDs = append(allShapeUUIDs, shapeUUID)
			}
		}

		// Fetch full shape data from DB
		shapeDataMap := make(map[string]map[string]interface{})
		if w.boardDataRepo != nil && len(allShapeUUIDs) > 0 {
			dbShapes, err := w.boardDataRepo.GetShapesByUUIDs(allShapeUUIDs)
			if err != nil {
				log.Printf("Warning: Failed to fetch shape data from DB: %v", err)
			} else {
				for _, shape := range dbShapes {
					// Parse the JSON data field
					var data map[string]interface{}
					if err := json.Unmarshal(shape.Data, &data); err == nil {
						data["type"] = string(shape.Type)
						data["id"] = shape.UUID.String()
						shapeDataMap[shape.UUID.String()] = data
					}
				}
				log.Printf("Fetched %d shapes with full data from DB", len(dbShapes))
			}
		}

		// Step 3: Fetch images and annotate each selection group
		globalShapeNumber := 1
		for _, group := range urlToGroup {
			// Fetch the image
			resp, err := http.Get(group.url)
			if err != nil {
				log.Printf("Failed to fetch image: %v", err)
				continue
			}
			imageData, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				log.Printf("Failed to read image data: %v", err)
				continue
			}
			imageBase64 := base64.StdEncoding.EncodeToString(imageData)

			// Build shapes array for annotation (with translated coordinates)
			var shapesForAnnotation []map[string]interface{}
			var shapeImages []agents.ShapeImage
			var shapesForToon []map[string]interface{}

			for _, shapeUrl := range group.shapes {
				shapeData := shapeDataMap[shapeUrl.ShapeId]
				if shapeData == nil {
					shapeData = map[string]interface{}{"type": "unknown", "id": shapeUrl.ShapeId}
				}

				// Translate coordinates relative to selection bounds
				translatedData := make(map[string]interface{})
				for k, v := range shapeData {
					translatedData[k] = v
				}

				if group.bounds != nil {
					// Translate x, y coordinates
					if x, ok := shapeData["x"].(float64); ok {
						translatedData["x"] = x - group.bounds.MinX + group.bounds.Padding
					}
					if y, ok := shapeData["y"].(float64); ok {
						translatedData["y"] = y - group.bounds.MinY + group.bounds.Padding
					}
				}

				// Add annotation number
				translatedData["number"] = globalShapeNumber

				shapesForAnnotation = append(shapesForAnnotation, translatedData)

				// Build ShapeImage
				shapeImages = append(shapeImages, agents.ShapeImage{
					ShapeId:   shapeUrl.ShapeId,
					MimeType:  "image/png",
					ShapeData: shapeData,
					Number:    globalShapeNumber,
				})

				// Build shape data for TOON encoding
				shapesForToon = append(shapesForToon, map[string]interface{}{
					"n":    globalShapeNumber,
					"type": shapeData["type"],
					"id":   shapeUrl.ShapeId,
					"x":    shapeData["x"],
					"y":    shapeData["y"],
					"r":    shapeData["r"],
					"w":    shapeData["w"],
					"h":    shapeData["h"],
					"fill": shapeData["fill"],
				})

				globalShapeNumber++
			}

			// Annotate the image
			annotatedImage, _, err := tools.AnnotateImageWithNumbers(imageBase64, shapesForAnnotation)
			if err != nil {
				log.Printf("Warning: Failed to annotate image: %v, using original", err)
				annotatedImage = imageBase64
			}

			// Format with TOON using gotoon library
			toonData := map[string]interface{}{"shapes": shapesForToon}
			shapeMetadata, err := gotoon.Encode(toonData)
			if err != nil {
				log.Printf("Warning: Failed to encode TOON: %v", err)
				shapeMetadata = fmt.Sprintf("shapes: %v", shapesForToon)
			}

			annotatedSelections = append(annotatedSelections, agents.AnnotatedSelection{
				AnnotatedImage: annotatedImage,
				MimeType:       "image/png",
				Shapes:         shapeImages,
				ShapeMetadata:  shapeMetadata,
			})
		}
		log.Printf("Created %d annotated selections", len(annotatedSelections))
	}

	// send an event that the chat is starting
	libraries.SendEventType(hub, client, libraries.WebSocketMessageTypeChatStarting)

	// process the chat message - pass client and boardId for streaming
	aiResponse, err := agent.ProcessRequestStream(context.Background(), hub, client, cfg.Message.Message, chatHistory, cfg.BoardId, cfg.ActiveTheme, annotatedSelections)
	if err != nil {
		// Log the error for debugging but still try to send a helpful message
		log.Printf("Error processing chat message: %v", err)
		
		// Send a more informative error message
		errorMsg := fmt.Sprintf("I encountered an issue while processing your request: %v. Some shapes may have been created successfully. Please check the canvas.", err)
		libraries.SendChatMessageResponse(hub, client, libraries.WebSocketMessageTypeChatResponse, &libraries.ChatMessageResponsePayload{
			BoardId: cfg.BoardId,
			Message: errorMsg,
		})
		
		// Still try to save what we have (even if partial)
		if aiResponse != "" {
			_, _, saveErr := w.chatRepo.CreateHumanAndAiMessages(boardIdUUID, cfg.Message.Message, aiResponse)
			if saveErr != nil {
				log.Printf("Failed to save chat messages: %v", saveErr)
			}
		}
		
		// Send completion event even on error
		libraries.SendChatMessageResponse(hub, client, libraries.WebSocketMessageTypeChatCompleted, &libraries.ChatMessageResponsePayload{
			BoardId: cfg.BoardId,
			Message: aiResponse,
		})
		return
	}

	// Safety net: if aiResponse is empty, provide a default message to prevent database issues
	if strings.TrimSpace(aiResponse) == "" {
		log.Printf("Warning: AI response is empty after processing, providing default message")
		aiResponse = "I processed your request but was unable to generate a text response. Please check the board for any changes that were made."
	}

	// after get successful response, create a chat in the database
	human_message_id, ai_message_id, err := w.chatRepo.CreateHumanAndAiMessages(boardIdUUID, cfg.Message.Message, aiResponse)
	if err != nil {
		libraries.SendErrorMessage(hub, client, "Failed to create human and ai messages")
		return
	}

	// send an event that the chat is completed
	libraries.SendChatMessageResponse(hub , client, libraries.WebSocketMessageTypeChatCompleted, &libraries.ChatMessageResponsePayload{
		BoardId: cfg.BoardId,
		Message: aiResponse,
		HumanMessageId: human_message_id.String(),
		AiMessageId: ai_message_id.String(),
	})

}