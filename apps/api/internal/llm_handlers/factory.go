package llmHandlers

import (
	"fmt"
)

type Provider string

const (
	ProviderVertexClaude Provider = "vertex_claude"
	ProviderLangChain    Provider = "langchain" // openai / groq / llama etc.
)

type Config struct {
	Provider Provider

	// LangChain config
	LangChain LangChainConfig

	// Vertex Claude config
	Vertex VertexAnthropicClient
}

func NewLLMClient(kind string) (Client, error) {
	switch kind {
	case "vertex_anthropic":
		return NewVertexAnthropicClient(nil), nil
	case "langchain":
		return NewLangChainClient(LangChainConfig{Model: "gpt-4.1"})
	default:
		return nil, fmt.Errorf("unknown provider %s", kind)
	}
}
