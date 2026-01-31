package llmHandlers

import (
	"fmt"
	"melina-studio-backend/internal/libraries"
)

type TokenUsage struct {
	InputTokens    int
	OutputTokens   int
	TotalTokens    int
	CountingMethod string // "provider_api" or "tiktoken"
}

func estimateWithTiktoken(input string, outputs []string, model string) *TokenUsage {
	fmt.Printf("[token_usage] Estimating with tiktoken for model: %s\n", model)
	var inputTokens int
	var outputTokens int

	// count input tokens
	if count, err := libraries.CountTokens(input, model); err == nil {
		inputTokens = count
	}

	// count output tokens
	for _, output := range outputs {
		if count, err := libraries.CountTokens(output, model); err == nil {
			outputTokens = count
		}
	}

	return &TokenUsage{
		InputTokens:    inputTokens,
		OutputTokens:   outputTokens,
		TotalTokens:    inputTokens + outputTokens,
		CountingMethod: "tiktoken",
	}
}

// Extract from anthropic response
func ExtractAnthropicUsage(response *ClaudeResponse, inputText string) *TokenUsage {
	fmt.Printf("[token_usage] Anthropic response: %+v\n", response)
	if raw, ok := response.RawResponse.(map[string]interface{}); ok {
		fmt.Printf("[token_usage] Raw response: %+v\n", raw)
		if usage, ok := raw["usage"].(map[string]interface{}); ok {
			fmt.Printf("[token_usage] Usage: %+v\n", usage)

			// Try to extract input tokens (handle both int and float64)
			var inputTokens int
			if val, ok := usage["input_tokens"].(int); ok {
				inputTokens = val
			} else if val, ok := usage["input_tokens"].(float64); ok {
				inputTokens = int(val)
			}

			// Try to extract output tokens (handle both int and float64)
			var outputTokens int
			if val, ok := usage["output_tokens"].(int); ok {
				outputTokens = val
			} else if val, ok := usage["output_tokens"].(float64); ok {
				outputTokens = int(val)
			}

			if inputTokens > 0 || outputTokens > 0 {
				fmt.Printf("[token_usage] Found input tokens: %d, output tokens: %d\n", inputTokens, outputTokens)
				return &TokenUsage{
					InputTokens:    inputTokens,
					OutputTokens:   outputTokens,
					TotalTokens:    inputTokens + outputTokens,
					CountingMethod: "provider_api",
				}
			}
		}
	}

	fmt.Printf("[token_usage] No usage found, falling back to tiktoken\n")
	return estimateWithTiktoken(inputText, response.TextContent, "claude-4.5-sonnet")
}

// Extract from Gemini response
func ExtractGeminiUsage(response *GeminiResponse, inputText string) *TokenUsage {
	// Gemini includes usageMetadata in response
	if response.RawResponse != nil && len(response.RawResponse.Candidates) > 0 {
		usage := response.RawResponse.UsageMetadata
		if usage != nil {
			total := int(usage.PromptTokenCount + usage.CandidatesTokenCount)
			return &TokenUsage{
				InputTokens:    int(usage.PromptTokenCount),
				OutputTokens:   int(usage.CandidatesTokenCount),
				TotalTokens:    total,
				CountingMethod: "provider_api",
			}
		}
	}

	// Fallback to tiktoken
	return estimateWithTiktoken(inputText, response.TextContent, "gemini")
}

// Extract from LangChain response
func ExtractLangChainUsage(response *LangChainResponse, inputText string) *TokenUsage {
	// OpenAI/Groq responses include usage in GenerationInfo
	if response.RawResponse != nil && len(response.RawResponse.Choices) > 0 {
		choice := response.RawResponse.Choices[0]

		// Check GenerationInfo for usage data
		if choice.GenerationInfo != nil {
			fmt.Printf("[token_usage] LangChain GenerationInfo keys: %v\n", getMapKeys(choice.GenerationInfo))

			// Try to extract token usage from GenerationInfo
			// OpenAI format: {"CompletionTokens": X, "PromptTokens": Y, "TotalTokens": Z}
			if totalTokens, ok := choice.GenerationInfo["TotalTokens"].(int); ok && totalTokens > 0 {
				fmt.Printf("[token_usage] Found TotalTokens in GenerationInfo: %d\n", totalTokens)
				return &TokenUsage{
					InputTokens:    choice.GenerationInfo["PromptTokens"].(int),
					OutputTokens:   choice.GenerationInfo["CompletionTokens"].(int),
					TotalTokens:    totalTokens,
					CountingMethod: "provider_api",
				}
			}

			// Alternative: calculate from CompletionTokens + PromptTokens
			var promptTokens, completionTokens int
			if pt, ok := choice.GenerationInfo["PromptTokens"].(int); ok {
				promptTokens = pt
			}
			if ct, ok := choice.GenerationInfo["CompletionTokens"].(int); ok {
				completionTokens = ct
			}

			if promptTokens > 0 || completionTokens > 0 {
				fmt.Printf("[token_usage] Calculated from PromptTokens (%d) + CompletionTokens (%d) = %d\n",
					promptTokens, completionTokens, promptTokens+completionTokens)
				return &TokenUsage{
					InputTokens:    promptTokens,
					OutputTokens:   completionTokens,
					TotalTokens:    promptTokens + completionTokens,
					CountingMethod: "provider_api",
				}
			}

			fmt.Printf("[token_usage] No token usage found in GenerationInfo, falling back to tiktoken\n")
		} else {
			fmt.Printf("[token_usage] GenerationInfo is nil, falling back to tiktoken\n")
		}
	}

	// Fallback to tiktoken
	return estimateWithTiktoken(inputText, response.TextContent, "openai")
}

// ExtractOpenRouterUsage extracts token usage from OpenRouter response
func ExtractOpenRouterUsage(response *OpenRouterResponse, inputText string) *TokenUsage {
	// First try non-streaming response (RawResponse)
	if response.RawResponse != nil {
		usage := response.RawResponse.Usage
		if usage.TotalTokens > 0 {
			fmt.Printf("[openrouter] Token usage: prompt=%d, completion=%d, total=%d\n",
				usage.PromptTokens, usage.CompletionTokens, usage.TotalTokens)
			return &TokenUsage{
				InputTokens:    usage.PromptTokens,
				OutputTokens:   usage.CompletionTokens,
				TotalTokens:    usage.TotalTokens,
				CountingMethod: "provider_api",
			}
		}
	}

	// Then try streaming response (StreamUsage captured from final chunk after finish_reason)
	if response.StreamUsage != nil && response.StreamUsage.TotalTokens > 0 {
		fmt.Printf("[openrouter] Token usage: prompt=%d, completion=%d, total=%d\n",
			response.StreamUsage.PromptTokens, response.StreamUsage.CompletionTokens, response.StreamUsage.TotalTokens)
		return &TokenUsage{
			InputTokens:    response.StreamUsage.PromptTokens,
			OutputTokens:   response.StreamUsage.CompletionTokens,
			TotalTokens:    response.StreamUsage.TotalTokens,
			CountingMethod: "provider_api",
		}
	}

	// Fallback to tiktoken estimation
	fmt.Printf("[openrouter] No usage data found, falling back to tiktoken estimation\n")
	return estimateWithTiktoken(inputText, response.TextContent, "openai")
}

// Helper function to get map keys for debugging
func getMapKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
