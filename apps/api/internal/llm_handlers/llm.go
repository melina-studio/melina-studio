package llmHandlers

import (
	"context"
	"melina-studio-backend/internal/libraries"
)

type MessageRole string

const (
	RoleSystem    MessageRole = "system"
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
)

// ResponseWithUsage wraps the text response with token usage information
type ResponseWithUsage struct {
	Text       string
	Thinking   string // Accumulated thinking/reasoning content (if enabled)
	TokenUsage *TokenUsage
}

type ChatStreamRequest struct {
	Ctx            context.Context
	Hub            *libraries.Hub
	Client         *libraries.Client
	BoardID        string
	SystemMessage  string
	Messages       []Message
	EnableThinking bool
}

type Client interface {
	Chat(ctx context.Context, systemMessage string, messages []Message, enableThinking bool) (string, error)
	ChatStream(ctx context.Context, hub *libraries.Hub, client *libraries.Client, boardId string, systemMessage string, messages []Message, enableThinking bool) (string, error)
	// ChatStreamWithUsage returns both the response text and token usage
	ChatStreamWithUsage(req ChatStreamRequest) (*ResponseWithUsage, error)
}

/*

func exampleRun() {
	ctx := context.Background()
	client := initVertexAnthropic() // or initLangChain()

	systemPrompt := "You are an expert software engineer. Answer concisely."
	history := []llm.Message{
		{Role: llm.RoleUser, Content: "Explain RBAC vs ABAC."},
		{Role: llm.RoleAssistant, Content: "RBAC uses roles; ABAC uses attributes."},
	}
	msgs := buildMessages(systemPrompt, history, "Which is better for large enterprises?")

	answer, err := getAnswer(ctx, client, msgs)
	if err != nil {
		log.Fatalf("chat error: %v", err)
	}
	fmt.Println("AI answer:\n", answer)
}

*/
