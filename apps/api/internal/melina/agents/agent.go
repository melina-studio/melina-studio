package agents

import (
	"context"
	"fmt"
	"log"
	"os"

	"melina-studio-backend/internal/constants"
	"melina-studio-backend/internal/libraries"
	llmHandlers "melina-studio-backend/internal/llm_handlers"
	"melina-studio-backend/internal/melina/helpers"
	"melina-studio-backend/internal/melina/prompts"
	"melina-studio-backend/internal/melina/tools"
	"melina-studio-backend/internal/models"
)

type Agent struct {
	llmClient llmHandlers.Client
	loaderGen *llmHandlers.LoaderGenerator
}

// NewAgentWithModel creates an agent using the model registry info
// This is the preferred method as it uses validated model configurations
func NewAgentWithModel(modelInfo *llmHandlers.ModelInfo, temperature *float32, maxTokens *int, loaderGen *llmHandlers.LoaderGenerator) *Agent {
	var cfg llmHandlers.Config

	switch modelInfo.Provider {
	case llmHandlers.ProviderOpenAI:
		cfg = llmHandlers.Config{
			Provider:    llmHandlers.ProviderOpenAI,
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
		loaderGen: loaderGen,
	}
}

// ProcessRequest processes a user message with optional board image
// boardId can be empty string if no image should be included
func (a *Agent) ProcessRequest(ctx context.Context, message string, chatHistory []llmHandlers.Message, boardId string, enableThinking bool) (string, error) {
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
	response, err := a.llmClient.Chat(ctx, systemMessage, messages, enableThinking)
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
	uploadedImages []helpers.UploadedImage,
	enableThinking bool) (string, error) {

	// Build messages for the LLM
	systemMessage := fmt.Sprintf(prompts.MASTER_PROMPT, boardId, activeTheme)

	// Build user message content - may include annotated images if selections provided
	var userContent interface{}

	// Check if we have annotated selections to include
	if annotatedSelections, ok := selections.([]helpers.AnnotatedSelection); ok && len(annotatedSelections) > 0 {
		// Build multimodal content with annotated images, gotoon data, and uploaded images
		userContent = helpers.BuildMultimodalContentWithAnnotations(message, annotatedSelections, uploadedImages)
		log.Printf("Built multimodal content with %d annotated selections and %d uploaded images", len(annotatedSelections), len(uploadedImages))
	} else if images, ok := selections.([]helpers.ShapeImage); ok && len(images) > 0 {
		// Fallback: Build multimodal content with plain images (no annotation)
		userContent = helpers.BuildMultimodalContent(message, images)
		log.Printf("Built multimodal content with %d shape images (no annotation)", len(images))
	} else if len(uploadedImages) > 0 {
		// Only uploaded images, no selections
		userContent = helpers.BuildMultimodalContentWithUploadedImages(message, uploadedImages)
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
	response, err := a.llmClient.ChatStream(ctx, hub, client, boardId, systemMessage, messages, enableThinking)
	if err != nil {
		return "", fmt.Errorf("LLM chat error: %w", err)
	}

	return response, nil
}

// ProcessRequestStreamWithUsage processes a user message and returns both the response and token usage
// canvasStateXML is an optional XML string describing the spatial state of the canvas (occupied regions, etc.)
func (a *Agent) ProcessRequestStreamWithUsage(
	ctx context.Context,
	hub *libraries.Hub,
	client *libraries.Client,
	message string,
	chatHistory []llmHandlers.Message,
	boardId string,
	activeTheme string,
	selections interface{},
	uploadedImages []helpers.UploadedImage,
	enableThinking bool,
	canvasStateXML string,
	customRules string) (*llmHandlers.ResponseWithUsage, error) {

	// Build messages for the LLM
	systemMessage := fmt.Sprintf(prompts.MASTER_PROMPT, boardId, activeTheme)

	// Prepend canvas state to user message if available
	// This gives the LLM spatial awareness of existing shapes
	effectiveMessage := message
	if canvasStateXML != "" {
		effectiveMessage = canvasStateXML + "\n\n" + message
		log.Printf("Prepended canvas state to message (%d chars)", len(canvasStateXML))
	}

	if customRules != "" {
		effectiveMessage = customRules + "\n\n" + effectiveMessage
		log.Printf("Prepended custom rules to message (%d chars)", len(customRules))
	}

	// Build user message content - may include annotated images if selections provided
	var userContent interface{}

	// Check if we have annotated selections to include
	if annotatedSelections, ok := selections.([]helpers.AnnotatedSelection); ok && len(annotatedSelections) > 0 {
		userContent = helpers.BuildMultimodalContentWithAnnotations(effectiveMessage, annotatedSelections, uploadedImages)
		log.Printf("Built multimodal content with %d annotated selections and %d uploaded images", len(annotatedSelections), len(uploadedImages))
	} else if images, ok := selections.([]helpers.ShapeImage); ok && len(images) > 0 {
		userContent = helpers.BuildMultimodalContent(effectiveMessage, images)
		log.Printf("Built multimodal content with %d shape images (no annotation)", len(images))
	} else if len(uploadedImages) > 0 {
		userContent = helpers.BuildMultimodalContentWithUploadedImages(effectiveMessage, uploadedImages)
		log.Printf("Built multimodal content with %d uploaded images only (first image mimeType: %s, data length: %d)",
			len(uploadedImages), uploadedImages[0].MimeType, len(uploadedImages[0].Base64Data))
	} else {
		userContent = effectiveMessage
	}

	messages := []llmHandlers.Message{}

	if len(chatHistory) > 0 {
		messages = append(messages, chatHistory...)
	}

	messages = append(messages, llmHandlers.Message{
		Role:    models.RoleUser,
		Content: userContent,
	})

	// Reset loader generator state for this new chat request
	if a.loaderGen != nil {
		a.loaderGen.Reset()
	}

	ctx = context.WithValue(ctx, constants.MaxIterationsKey, constants.DefaultMaxIterations)

	// Call the LLM with usage tracking
	resp, err := a.llmClient.ChatStreamWithUsage(llmHandlers.ChatStreamRequest{
		Ctx:            ctx,
		Hub:            hub,
		Client:         client,
		BoardID:        boardId,
		SystemMessage:  systemMessage,
		Messages:       messages,
		EnableThinking: enableThinking,
		LoaderGen:      a.loaderGen,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM chat error: %w", err)
	}

	return resp, nil
}
