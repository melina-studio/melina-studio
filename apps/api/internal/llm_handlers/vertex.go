package llmHandlers

import (
	"context"
	"melina-studio-backend/internal/models"
	"strings"
)

// VertexAnthropicClient implements llm.Client using your libraries.ChatWithTools
type VertexAnthropicClient struct {
	// optional config fields (project, modelID) if needed
	Tools []map[string]interface{} // optional metadata you send to Claude
}

func NewVertexAnthropicClient(tools []map[string]interface{}) *VertexAnthropicClient {
	return &VertexAnthropicClient{Tools: tools}
}

// Chat returns a single string answer (convenience wrapper).
func (c *VertexAnthropicClient) Chat(ctx context.Context, systemMessage string, messages []Message) (string, error) {
	// Convert llmMessage -> libraries.Message
	msgs := make([]Message, 0, len(messages))
	for _, m := range messages {
		msgs = append(msgs, Message{
			Role:    models.Role(m.Role),
			Content: m.Content,
		})
	}

	resp, err := ChatWithTools(ctx, systemMessage, msgs, c.Tools)
	if err != nil {
		return "", err
	}
	return strings.Join(resp.TextContent, "\n\n"), nil
}

/*

func initVertexAnthropic() llm.Client {
	tools := []map[string]interface{}{} // optional metadata if you want to advertise tools
	client := llm.NewVertexAnthropicClient(tools)
	return client
}

*/
