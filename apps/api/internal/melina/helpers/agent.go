package helpers

import (
	"encoding/base64"
)

// formatMessageWithImage formats a message with image for the current provider
// Returns content in the format expected by the provider
func FormatMessageWithImage(text string, imageData []byte) interface{} {
	// Encode image as base64
	imageBase64 := base64.StdEncoding.EncodeToString(imageData)
	
	// Check provider type and format accordingly
	// For now, we'll use a format that works for both Anthropic and Gemini
	// The actual client implementations will handle the conversion
	
	// Format: []map[string]interface{} for Anthropic-style providers
	// Format: mixed content array for providers that support it
	return []map[string]interface{}{
		{
			"type": "text",
			"text": text,
		},
		{
			"type": "image",
			"source": map[string]interface{}{
				"type":      "base64",
				"media_type": "image/png",
				"data":      imageBase64,
			},
		},
	}
}
