package llmHandlers

import "fmt"

// ModelInfo contains information about a supported model
type ModelInfo struct {
	Provider    Provider
	ModelID     string // The actual model ID to send to the provider
	DisplayName string
}

// ModelRegistry maps model names to their configurations
// The key is the model name that frontend sends (e.g., "claude-4.5-sonnet")
var ModelRegistry = map[string]ModelInfo{
	// Anthropic models (via Vertex) - use Vertex model IDs
	"claude-4.5-sonnet": {
		Provider:    ProviderVertexAnthropic,
		ModelID:     "claude-sonnet-4-5@20250929", // Vertex model ID format
		DisplayName: "Claude 4.5 Sonnet",
	},
	"claude-4-opus": {
		Provider:    ProviderVertexAnthropic,
		ModelID:     "claude-opus-4@20250514", // Vertex model ID format
		DisplayName: "Claude 4 Opus",
	},

	// Groq models (via LangChain)
	"meta-llama/llama-4-scout-17b-16e-instruct": {
		Provider:    ProviderLangChainGroq,
		ModelID:     "meta-llama/llama-4-scout-17b-16e-instruct",
		DisplayName: "Llama 4 Scout 17B",
	},
	"llama-3.3-70b-versatile": {
		Provider:    ProviderLangChainGroq,
		ModelID:     "llama-3.3-70b-versatile",
		DisplayName: "Llama 3.3 70B Versatile",
	},

	// OpenAI models (via LangChain)
	"gpt-5.1": {
		Provider:    ProviderLangChainOpenAI,
		ModelID:     "gpt-5.1",
		DisplayName: "GPT 5.1",
	},
	"gpt-4.1": {
		Provider:    ProviderLangChainOpenAI,
		ModelID:     "gpt-4.1",
		DisplayName: "GPT 4.1",
	},

	// Gemini models
	"gemini-2.5-flash": {
		Provider:    ProviderGemini,
		ModelID:     "gemini-2.5-flash",
		DisplayName: "Gemini 2.5 Flash",
	},
	"gemini-2.5-pro": {
		Provider:    ProviderGemini,
		ModelID:     "gemini-2.5-pro",
		DisplayName: "Gemini 2.5 Pro",
	},

	// OpenRouter models
	"moonshotai/kimi-k2.5": {
		Provider:    ProviderOpenRouter,
		ModelID:     "moonshotai/kimi-k2.5",
		DisplayName: "Kimi K2.5",
	},
	"anthropic/claude-3.5-sonnet": {
		Provider:    ProviderOpenRouter,
		ModelID:     "anthropic/claude-3.5-sonnet",
		DisplayName: "Claude 3.5 Sonnet (OpenRouter)",
	},
}

// ValidateModel checks if a model name is valid and returns its info
func ValidateModel(modelName string) (*ModelInfo, error) {
	info, exists := ModelRegistry[modelName]
	if !exists {
		return nil, fmt.Errorf("unknown model: %s", modelName)
	}
	return &info, nil
}

// GetAllowedModels returns a list of all allowed model names
func GetAllowedModels() []string {
	models := make([]string, 0, len(ModelRegistry))
	for name := range ModelRegistry {
		models = append(models, name)
	}
	return models
}

// GetModelsByProvider returns all models for a specific provider
func GetModelsByProvider(provider Provider) []string {
	models := []string{}
	for name, info := range ModelRegistry {
		if info.Provider == provider {
			models = append(models, name)
		}
	}
	return models
}
