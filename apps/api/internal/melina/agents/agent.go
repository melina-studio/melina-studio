package agents

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"melina-studio-backend/internal/libraries"
	llmHandlers "melina-studio-backend/internal/llm_handlers"
	"melina-studio-backend/internal/melina/prompts"
	"melina-studio-backend/internal/melina/tools"
	"melina-studio-backend/internal/models"
)

// UploadedImage represents a user-uploaded image (no annotation needed)
// Defined here to avoid import cycle with service package
type UploadedImage struct {
	Base64Data string
	MimeType   string
}

type Agent struct {
	llmClient llmHandlers.Client
}

// ShapeImage represents a base64-encoded shape image with shape metadata
type ShapeImage struct {
	ShapeId   string
	MimeType  string
	Data      string                 // base64 encoded (may be annotated)
	ShapeData map[string]interface{} // full shape properties from DB
	Number    int                    // annotation number (1-based)
}

// AnnotatedSelection represents an annotated image with its shapes
type AnnotatedSelection struct {
	AnnotatedImage string // base64 annotated image
	MimeType       string
	Shapes         []ShapeImage // shapes in this selection
	ShapeMetadata  string       // TOON-formatted shape data for LLM
}

// NewAgentWithModel creates an agent using the model registry info
// This is the preferred method as it uses validated model configurations
func NewAgentWithModel(modelInfo *llmHandlers.ModelInfo, temperature *float32, maxTokens *int) *Agent {
	var cfg llmHandlers.Config

	switch modelInfo.Provider {
	case llmHandlers.ProviderLangChainOpenAI:
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderLangChainOpenAI,
			Model:       modelInfo.ModelID,
			APIKey:      os.Getenv("OPENAI_API_KEY"),
			Tools:       tools.GetOpenAITools(),
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}

	case llmHandlers.ProviderLangChainGroq:
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderLangChainGroq,
			Model:       modelInfo.ModelID,
			BaseURL:     os.Getenv("GROQ_BASE_URL"),
			APIKey:      os.Getenv("GROQ_API_KEY"),
			Tools:       tools.GetGroqTools(),
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}

	case llmHandlers.ProviderVertexAnthropic:
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderVertexAnthropic,
			Model:       modelInfo.ModelID, // e.g., "claude-sonnet-4-5@20250929"
			Tools:       tools.GetAnthropicTools(),
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}

	case llmHandlers.ProviderGemini:
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderGemini,
			Model:       modelInfo.ModelID,
			Tools:       tools.GetGeminiTools(),
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}

	case llmHandlers.ProviderOpenRouter:
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderOpenRouter,
			Model:       modelInfo.ModelID,
			Tools:       tools.GetOpenAITools(), // OpenRouter is OpenAI-compatible
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}

	default:
		log.Fatalf("Unknown provider: %s", modelInfo.Provider)
	}

	llmClient, err := llmHandlers.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize LLM client (%s/%s): %v", modelInfo.Provider, modelInfo.ModelID, err)
	}

	return &Agent{
		llmClient: llmClient,
	}
}

// NewAgent creates an agent using a provider string (legacy method)
// Deprecated: Use NewAgentWithModel instead
func NewAgent(provider string, temperature *float32, maxTokens *int) *Agent {
	var cfg llmHandlers.Config

	switch provider {
	case "openai":
		tools := tools.GetOpenAITools()
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderLangChainOpenAI,
			Model:       "gpt-5.1",
			APIKey:      os.Getenv("OPENAI_API_KEY"),
			Tools:       tools,
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}

	case "groq":
		tools := tools.GetGroqTools()
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderLangChainGroq,
			Model:       os.Getenv("GROQ_MODEL_NAME"),
			BaseURL:     os.Getenv("GROQ_BASE_URL"),
			APIKey:      os.Getenv("GROQ_API_KEY"),
			Tools:       tools,
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}

	case "anthropic":
		tools := tools.GetAnthropicTools()
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderVertexAnthropic,
			Tools:       tools,
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}
	case "gemini":
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderGemini,
			Tools:       tools.GetGeminiTools(),
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}

	case "openrouter":
		tools := tools.GetOpenAITools() // OpenRouter is OpenAI-compatible
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderOpenRouter,
			Model:       os.Getenv("OPENROUTER_MODEL_NAME"), // e.g., "moonshotai/kimi-k2.5"
			Tools:       tools,
			Temperature: temperature,
			MaxTokens:   maxTokens,
		}

	default:
		log.Fatalf("Unknown provider: %s. Valid options: openai, groq, anthropic, gemini, openrouter", provider)
	}

	llmClient, err := llmHandlers.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize LLM client (%s): %v", provider, err)
	}

	return &Agent{
		llmClient: llmClient,
	}
}

// ProcessRequest processes a user message with optional board image
// boardId can be empty string if no image should be included
func (a *Agent) ProcessRequest(ctx context.Context, message string, chatHistory []llmHandlers.Message, boardId string) (string, error) {
	// Build messages for the LLM
	// Default to "light" theme if not provided (prompt expects 2 placeholders: boardId and activeTheme)
	activeTheme := "light"
	systemMessage := fmt.Sprintf(prompts.MASTER_PROMPT, boardId, activeTheme)

	// Build user message content - may include image if boardId is provided
	var userContent interface{} = message

	messages := []llmHandlers.Message{}

	if len(chatHistory) > 0 {
		messages = append(messages, chatHistory...)
	}

	messages = append(messages, llmHandlers.Message{
		Role:    models.RoleUser,
		Content: userContent,
	})

	// Call the LLM
	response, err := a.llmClient.Chat(ctx, systemMessage, messages)
	if err != nil {
		return "", fmt.Errorf("LLM chat error: %w", err)
	}

	return response, nil
}

// ProcessRequestStream processes a user message with optional board image
// boardId can be empty string if no image should be included
// client can be nil if streaming is not needed
// selections contains annotated selection images with shape data (can be nil or empty)
// uploadedImages contains user-uploaded reference images (can be nil or empty)
func (a *Agent) ProcessRequestStream(
	ctx context.Context,
	hub *libraries.Hub,
	client *libraries.Client,
	message string,
	chatHistory []llmHandlers.Message,
	boardId string,
	activeTheme string,
	selections interface{},
	uploadedImages []UploadedImage) (string, error) {

	// Build messages for the LLM
	systemMessage := fmt.Sprintf(prompts.MASTER_PROMPT, boardId, activeTheme)

	// Build user message content - may include annotated images if selections provided
	var userContent interface{}

	// Check if we have annotated selections to include
	if annotatedSelections, ok := selections.([]AnnotatedSelection); ok && len(annotatedSelections) > 0 {
		// Build multimodal content with annotated images, gotoon data, and uploaded images
		userContent = buildMultimodalContentWithAnnotations(message, annotatedSelections, uploadedImages)
		log.Printf("Built multimodal content with %d annotated selections and %d uploaded images", len(annotatedSelections), len(uploadedImages))
	} else if images, ok := selections.([]ShapeImage); ok && len(images) > 0 {
		// Fallback: Build multimodal content with plain images (no annotation)
		userContent = buildMultimodalContent(message, images)
		log.Printf("Built multimodal content with %d shape images (no annotation)", len(images))
	} else if len(uploadedImages) > 0 {
		// Only uploaded images, no selections
		userContent = buildMultimodalContentWithUploadedImages(message, uploadedImages)
		log.Printf("Built multimodal content with %d uploaded images only (first image mimeType: %s, data length: %d)",
			len(uploadedImages), uploadedImages[0].MimeType, len(uploadedImages[0].Base64Data))
	} else {
		// Plain text message
		userContent = message
	}

	messages := []llmHandlers.Message{}

	if len(chatHistory) > 0 {
		messages = append(messages, chatHistory...)
	}

	messages = append(messages, llmHandlers.Message{
		Role:    models.RoleUser,
		Content: userContent,
	})

	// Call the LLM - pass client and boardId for streaming
	response, err := a.llmClient.ChatStream(ctx, hub, client, boardId, systemMessage, messages)
	if err != nil {
		return "", fmt.Errorf("LLM chat error: %w", err)
	}

	return response, nil
}

// ProcessRequestStreamWithUsage processes a user message and returns both the response and token usage
func (a *Agent) ProcessRequestStreamWithUsage(
	ctx context.Context,
	hub *libraries.Hub,
	client *libraries.Client,
	message string,
	chatHistory []llmHandlers.Message,
	boardId string,
	activeTheme string,
	selections interface{},
	uploadedImages []UploadedImage) (*llmHandlers.ResponseWithUsage, error) {

	// Build messages for the LLM
	systemMessage := fmt.Sprintf(prompts.MASTER_PROMPT, boardId, activeTheme)

	// Build user message content - may include annotated images if selections provided
	var userContent interface{}

	// Check if we have annotated selections to include
	if annotatedSelections, ok := selections.([]AnnotatedSelection); ok && len(annotatedSelections) > 0 {
		userContent = buildMultimodalContentWithAnnotations(message, annotatedSelections, uploadedImages)
		log.Printf("Built multimodal content with %d annotated selections and %d uploaded images", len(annotatedSelections), len(uploadedImages))
	} else if images, ok := selections.([]ShapeImage); ok && len(images) > 0 {
		userContent = buildMultimodalContent(message, images)
		log.Printf("Built multimodal content with %d shape images (no annotation)", len(images))
	} else if len(uploadedImages) > 0 {
		userContent = buildMultimodalContentWithUploadedImages(message, uploadedImages)
		log.Printf("Built multimodal content with %d uploaded images only (first image mimeType: %s, data length: %d)",
			len(uploadedImages), uploadedImages[0].MimeType, len(uploadedImages[0].Base64Data))
	} else {
		userContent = message
	}

	messages := []llmHandlers.Message{}

	if len(chatHistory) > 0 {
		messages = append(messages, chatHistory...)
	}

	messages = append(messages, llmHandlers.Message{
		Role:    models.RoleUser,
		Content: userContent,
	})

	// Call the LLM with usage tracking
	return a.llmClient.ChatStreamWithUsage(ctx, hub, client, boardId, systemMessage, messages)
}

// buildMultimodalContentWithAnnotations creates content with annotated images, TOON-formatted shape data, and uploaded images
func buildMultimodalContentWithAnnotations(message string, selections []AnnotatedSelection, uploadedImages []UploadedImage) []map[string]interface{} {
	content := []map[string]interface{}{}

	// Combine all shape metadata (TOON format)
	var allMetadata []string
	for _, sel := range selections {
		if sel.ShapeMetadata != "" {
			allMetadata = append(allMetadata, sel.ShapeMetadata)
		}
	}

	// Add context prefix with TOON-formatted shape data
	contextText := "The user has selected shapes on the canvas. Each shape is marked with a numbered badge in the image(s) below."
	if len(allMetadata) > 0 {
		contextText += "\n\nShape data (use shapeIds with updateShape tool):\n" + strings.Join(allMetadata, "\n\n")
	}
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": contextText,
	})

	// Add annotated images
	for _, sel := range selections {
		if sel.AnnotatedImage != "" {
			content = append(content, map[string]interface{}{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": sel.MimeType,
					"data":       sel.AnnotatedImage,
				},
			})
		}
	}

	// Add uploaded images (user-provided reference images, no annotation)
	if len(uploadedImages) > 0 {
		content = append(content, map[string]interface{}{
			"type": "text",
			"text": "The user has also attached the following reference images:",
		})
		for _, img := range uploadedImages {
			content = append(content, map[string]interface{}{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": img.MimeType,
					"data":       img.Base64Data,
				},
			})
		}
	}

	// Add user's actual message
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": message,
	})

	return content
}

// buildMultimodalContentWithUploadedImages creates content with only uploaded images (no canvas selections)
func buildMultimodalContentWithUploadedImages(message string, uploadedImages []UploadedImage) []map[string]interface{} {
	content := []map[string]interface{}{}

	// Add context prefix for uploaded images
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": "The user has attached the following reference images:",
	})

	// Add uploaded images
	for _, img := range uploadedImages {
		content = append(content, map[string]interface{}{
			"type": "image",
			"source": map[string]interface{}{
				"type":       "base64",
				"media_type": img.MimeType,
				"data":       img.Base64Data,
			},
		})
	}

	// Add user's actual message
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": message,
	})

	return content
}

// buildMultimodalContent creates a content array with text prefix, shape metadata, images, and user message
func buildMultimodalContent(message string, images []ShapeImage) []map[string]interface{} {
	content := []map[string]interface{}{}

	// Build shape metadata summary
	shapeDescriptions := []string{}
	for i, img := range images {
		if img.ShapeData != nil {
			shapeType := "unknown"
			if t, ok := img.ShapeData["type"].(string); ok {
				shapeType = t
			}
			shapeDescriptions = append(shapeDescriptions, fmt.Sprintf("#%d: %s (id: %s)", i+1, shapeType, img.ShapeId))
		}
	}

	// Add context prefix with shape metadata
	contextText := "The user has selected these shapes for context:"
	if len(shapeDescriptions) > 0 {
		contextText += "\n" + strings.Join(shapeDescriptions, "\n")
		contextText += "\n\nYou can use these shapeIds directly with updateShape tool to modify them."
	}
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": contextText,
	})

	// Add unique images (dedupe by URL since same image may be shared by multiple shapes)
	seenData := make(map[string]bool)
	for _, img := range images {
		if !seenData[img.Data] {
			seenData[img.Data] = true
			content = append(content, map[string]interface{}{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": img.MimeType,
					"data":       img.Data,
				},
			})
		}
	}

	// Add user's actual message
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": message,
	})

	return content
}
