package helpers

import (
	"encoding/base64"
	"fmt"
	"strings"
)

// ShapeImage represents a base64-encoded shape image with shape metadata
type ShapeImage struct {
	ShapeId   string
	MimeType  string
	Data      string                 // base64 encoded (may be annotated)
	ShapeData map[string]interface{} // full shape properties from DB
	Number    int                    // annotation number (1-based)
}

// AnnotatedSelection represents an annotated image with its shapes
type AnnotatedSelection struct {
	AnnotatedImage string // base64 annotated image
	MimeType       string
	Shapes         []ShapeImage // shapes in this selection
	ShapeMetadata  string       // TOON-formatted shape data for LLM
}

// UploadedImage represents a user-uploaded image (no annotation needed)
// Defined here to avoid import cycle with service package
type UploadedImage struct {
	Base64Data string
	MimeType   string
}

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
				"type":       "base64",
				"media_type": "image/png",
				"data":       imageBase64,
			},
		},
	}
}

// buildMultimodalContentWithAnnotations creates content with annotated images, TOON-formatted shape data, and uploaded images
func BuildMultimodalContentWithAnnotations(message string, selections []AnnotatedSelection, uploadedImages []UploadedImage) []map[string]interface{} {
	content := []map[string]interface{}{}

	// Combine all shape metadata (TOON format)
	var allMetadata []string
	for _, sel := range selections {
		if sel.ShapeMetadata != "" {
			allMetadata = append(allMetadata, sel.ShapeMetadata)
		}
	}

	// Add context prefix with TOON-formatted shape data
	contextText := "The user has selected shapes on the canvas. Each shape is marked with a numbered badge in the image(s) below."
	if len(allMetadata) > 0 {
		contextText += "\n\nShape data (use shapeIds with updateShape tool):\n" + strings.Join(allMetadata, "\n\n")
	}
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": contextText,
	})

	// Add annotated images
	for _, sel := range selections {
		if sel.AnnotatedImage != "" {
			content = append(content, map[string]interface{}{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": sel.MimeType,
					"data":       sel.AnnotatedImage,
				},
			})
		}
	}

	// Add uploaded images (user-provided reference images, no annotation)
	if len(uploadedImages) > 0 {
		content = append(content, map[string]interface{}{
			"type": "text",
			"text": "The user has also attached the following reference images:",
		})
		for _, img := range uploadedImages {
			content = append(content, map[string]interface{}{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": img.MimeType,
					"data":       img.Base64Data,
				},
			})
		}
	}

	// Add user's actual message
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": message,
	})

	return content
}

// buildMultimodalContentWithUploadedImages creates content with only uploaded images (no canvas selections)
func BuildMultimodalContentWithUploadedImages(message string, uploadedImages []UploadedImage) []map[string]interface{} {
	content := []map[string]interface{}{}

	// Add context prefix for uploaded images
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": "The user has attached the following reference images:",
	})

	// Add uploaded images
	for _, img := range uploadedImages {
		content = append(content, map[string]interface{}{
			"type": "image",
			"source": map[string]interface{}{
				"type":       "base64",
				"media_type": img.MimeType,
				"data":       img.Base64Data,
			},
		})
	}

	// Add user's actual message
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": message,
	})

	return content
}

// buildMultimodalContent creates a content array with text prefix, shape metadata, images, and user message
func BuildMultimodalContent(message string, images []ShapeImage) []map[string]interface{} {
	content := []map[string]interface{}{}

	// Build shape metadata summary
	shapeDescriptions := []string{}
	for i, img := range images {
		if img.ShapeData != nil {
			shapeType := "unknown"
			if t, ok := img.ShapeData["type"].(string); ok {
				shapeType = t
			}
			shapeDescriptions = append(shapeDescriptions, fmt.Sprintf("#%d: %s (id: %s)", i+1, shapeType, img.ShapeId))
		}
	}

	// Add context prefix with shape metadata
	contextText := "The user has selected these shapes for context:"
	if len(shapeDescriptions) > 0 {
		contextText += "\n" + strings.Join(shapeDescriptions, "\n")
		contextText += "\n\nYou can use these shapeIds directly with updateShape tool to modify them."
	}
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": contextText,
	})

	// Add unique images (dedupe by URL since same image may be shared by multiple shapes)
	seenData := make(map[string]bool)
	for _, img := range images {
		if !seenData[img.Data] {
			seenData[img.Data] = true
			content = append(content, map[string]interface{}{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": img.MimeType,
					"data":       img.Data,
				},
			})
		}
	}

	// Add user's actual message
	content = append(content, map[string]interface{}{
		"type": "text",
		"text": message,
	})

	return content
}
