package llmHandlers

import (
	"context"
)

type MessageRole string

const (
	RoleSystem    MessageRole = "system"
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
)

type Client interface {
	Chat(ctx context.Context, systemMessage string, messages []Message) (string, error)
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
