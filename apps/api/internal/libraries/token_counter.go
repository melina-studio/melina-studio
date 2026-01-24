package libraries

import (
	"fmt"

	"github.com/pkoukk/tiktoken-go"
)

// CountTokens counts tokens in text using tiktoken
func CountTokens(text string, model string) (int, error) {
    encoding := GetEncodingForModel(model)
    tke, err := tiktoken.GetEncoding(encoding)
    if err != nil {
        return 0, fmt.Errorf("get encoding: %w", err)
    }
    
    tokens := tke.Encode(text, nil, nil)
    return len(tokens), nil
}

// GetEncodingForModel maps model names to tiktoken encodings
func GetEncodingForModel(model string) string {
    // Anthropic Claude models use cl100k_base
    // OpenAI GPT-5.1 use cl100k_base
    // Gemini - approximate with cl100k_base
    // Default to cl100k_base for most modern models
    return "cl100k_base"
}