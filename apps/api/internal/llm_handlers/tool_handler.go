package llmHandlers

import (
	"context"
	"sync"
)

// ToolHandler is the function signature for tool handlers.
// Input is the tool input as map[string]interface{} and it returns any result or an error.
type ToolHandler func(ctx context.Context, input map[string]interface{}) (interface{}, error)

// toolHandlers is the registry that maps tool name -> handler.
var (
	toolHandlersMu sync.RWMutex
	toolHandlers   = make(map[string]ToolHandler)
)

// RegisterTool registers a ToolHandler under the given name.
// If a handler already exists, it will be overwritten.
func RegisterTool(name string, h ToolHandler) {
	toolHandlersMu.Lock()
	defer toolHandlersMu.Unlock()
	toolHandlers[name] = h
}

// UnregisterTool removes a registered tool handler.
func UnregisterTool(name string) {
	toolHandlersMu.Lock()
	defer toolHandlersMu.Unlock()
	delete(toolHandlers, name)
}

// getToolHandler returns a handler and a boolean indicating presence.
func getToolHandler(name string) (ToolHandler, bool) {
	toolHandlersMu.RLock()
	defer toolHandlersMu.RUnlock()
	h, ok := toolHandlers[name]
	return h, ok
}

// // // Call this from your init(), main(), or setup code to register handlers.
// func RegisterDefaultTools() {
// 	RegisterTool("get_weather", getWeatherHandler)
// 	RegisterTool("search_database", searchDatabaseHandler)
// }
