package llmHandlers

import (
	"fmt"
	"math/rand"
	"melina-studio-backend/internal/libraries"
	"os"
	"path/filepath"
	"sync"

	"gopkg.in/yaml.v3"
)

const (
	// MaxMessagesPerTool limits unique messages per tool type before repeating
	MaxMessagesPerTool = 2
	// CallsBeforeRepeat determines when to resend a message after max reached
	CallsBeforeRepeat = 5
)

// LoaderConfig holds the configuration loaded from YAML
type LoaderConfig struct {
	Messages map[string][]string `yaml:"messages"`
}

// LoaderGenerator generates loader messages from configuration
type LoaderGenerator struct {
	config        *LoaderConfig
	mu            sync.Mutex
	toolCallCount map[string]int      // Track calls per tool type
	usedMessages  map[string][]string // Track used messages per tool type
}

// Global config - loaded once on startup
var globalLoaderConfig *LoaderConfig
var configLoadOnce sync.Once
var configLoadErr error

// LoadLoaderConfig loads the loader messages configuration from YAML file
func LoadLoaderConfig() error {
	configLoadOnce.Do(func() {
		// Try multiple possible config paths
		possiblePaths := []string{
			"config/loader_messages.yaml",
			"../config/loader_messages.yaml",
			"/app/config/loader_messages.yaml", // Docker path
		}

		// Also try relative to executable
		execPath, err := os.Executable()
		if err == nil {
			execDir := filepath.Dir(execPath)
			possiblePaths = append(possiblePaths,
				filepath.Join(execDir, "config", "loader_messages.yaml"),
				filepath.Join(execDir, "..", "config", "loader_messages.yaml"),
			)
		}

		var data []byte
		var loadPath string
		for _, path := range possiblePaths {
			data, err = os.ReadFile(path)
			if err == nil {
				loadPath = path
				break
			}
		}

		if data == nil {
			configLoadErr = fmt.Errorf("could not find loader_messages.yaml in any expected location")
			return
		}

		globalLoaderConfig = &LoaderConfig{}
		if err := yaml.Unmarshal(data, globalLoaderConfig); err != nil {
			configLoadErr = fmt.Errorf("failed to parse loader config: %w", err)
			return
		}

		fmt.Printf("[loader_generator] Loaded config from %s with %d categories\n", loadPath, len(globalLoaderConfig.Messages))
	})

	return configLoadErr
}

// NewLoaderGenerator creates a new LoaderGenerator using the global config
func NewLoaderGenerator() (*LoaderGenerator, error) {
	// Ensure config is loaded
	if err := LoadLoaderConfig(); err != nil {
		return nil, err
	}

	if globalLoaderConfig == nil {
		return nil, fmt.Errorf("loader config not loaded")
	}

	return &LoaderGenerator{
		config:        globalLoaderConfig,
		toolCallCount: make(map[string]int),
		usedMessages:  make(map[string][]string),
	}, nil
}

// Reset clears the deduplication state - call at start of each chat request
func (lg *LoaderGenerator) Reset() {
	lg.mu.Lock()
	defer lg.mu.Unlock()
	lg.toolCallCount = make(map[string]int)
	lg.usedMessages = make(map[string][]string)
}

// GetMessage returns a random message for the given category
// Falls back to "thinking" category if the requested category doesn't exist
func (lg *LoaderGenerator) GetMessage(category string) string {
	if lg.config == nil {
		return "processing..."
	}

	msgs := lg.config.Messages[category]
	if len(msgs) == 0 {
		// Fallback to thinking category
		msgs = lg.config.Messages["thinking"]
	}
	if len(msgs) == 0 {
		return "processing..."
	}

	return msgs[rand.Intn(len(msgs))]
}

// GetThinkingMessage returns a random "thinking" category message
// Used immediately when chat_starting event fires
func (lg *LoaderGenerator) GetThinkingMessage() string {
	return lg.GetMessage("thinking")
}

// GenerateLoaderMessage gets a message for a tool call with deduplication
// Returns (message, shouldSend) where shouldSend is false if deduplication suppresses it
func (lg *LoaderGenerator) GenerateLoaderMessage(toolName string) (string, bool) {
	lg.mu.Lock()
	defer lg.mu.Unlock()

	lg.toolCallCount[toolName]++
	count := lg.toolCallCount[toolName]

	// First MaxMessagesPerTool calls: get a new message
	if count <= MaxMessagesPerTool {
		msg := lg.GetMessage(toolName)
		lg.usedMessages[toolName] = append(lg.usedMessages[toolName], msg)
		fmt.Printf("[loader_generator] Message for %s (%d): %s\n", toolName, count, msg)
		return msg, true
	}

	// Subsequent calls: only send every CallsBeforeRepeat calls
	if count%CallsBeforeRepeat != 0 {
		return "", false // Silent - no message
	}

	// Reuse a previously used message
	msgs := lg.usedMessages[toolName]
	if len(msgs) > 0 {
		msg := msgs[rand.Intn(len(msgs))]
		fmt.Printf("[loader_generator] Reusing message for %s (%d): %s\n", toolName, count, msg)
		return msg, true
	}

	return "", false
}

// SendLoaderUpdate sends a loader update message for a tool call
func (lg *LoaderGenerator) SendLoaderUpdate(hub *libraries.Hub, client *libraries.Client, boardId string, toolName string) {
	if hub == nil || client == nil {
		return
	}

	msg, shouldSend := lg.GenerateLoaderMessage(toolName)
	if shouldSend && msg != "" {
		libraries.SendLoaderUpdateMessage(hub, client, boardId, msg)
	}
}

// SendThinkingMessage sends an immediate "thinking" message
// Call this right after chat_starting event
func (lg *LoaderGenerator) SendThinkingMessage(hub *libraries.Hub, client *libraries.Client, boardId string) {
	if hub == nil || client == nil {
		fmt.Println("[loader_generator] SendThinkingMessage: hub or client is nil")
		return
	}

	msg := lg.GetThinkingMessage()
	fmt.Printf("[loader_generator] SendThinkingMessage: boardId=%s, message=%s\n", boardId, msg)
	if msg != "" {
		libraries.SendLoaderUpdateMessage(hub, client, boardId, msg)
	}
}
