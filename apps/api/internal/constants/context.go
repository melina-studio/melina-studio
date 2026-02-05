package constants

import (
	"context"
)

// ContextKey is a custom type for context keys to avoid collisions
type ContextKey string

const (
	// MaxIterationsKey is the context key for passing max iterations limit
	MaxIterationsKey ContextKey = "maxIterations"
	// DefaultMaxIterations is the default value when not specified in context
	DefaultMaxIterations = 7
)

func GetMaxIterations(ctx context.Context) int {
	if v := ctx.Value(MaxIterationsKey); v != nil {
		if n, ok := v.(int); ok {
			return n
		}
	}
	return DefaultMaxIterations
}
