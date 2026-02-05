package service

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/alpkeskin/gotoon"
	"github.com/google/uuid"

	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/melina/helpers"
	"melina-studio-backend/internal/melina/tools"
	"melina-studio-backend/internal/repo"
)

type ImageProcessor struct {
	boardDataRepo repo.BoardDataRepoInterface
}

func NewImageProcessor(boardDataRepo repo.BoardDataRepoInterface) *ImageProcessor {
	return &ImageProcessor{boardDataRepo: boardDataRepo}
}

// selectionGroup groups shapes that share the same image URL
type selectionGroup struct {
	url    string
	bounds *libraries.SelectionBounds
	shapes []libraries.ShapeImageUrl
}

// ProcessSelectionImages processes shape selection images: fetches, annotates, and formats with gotoon
func (p *ImageProcessor) ProcessSelectionImages(metadata *libraries.ChatMessageMetadata) []helpers.AnnotatedSelection {
	if metadata == nil || len(metadata.ShapeImageUrls) == 0 {
		return nil
	}

	log.Printf("Processing %d shape selections", len(metadata.ShapeImageUrls))

	// Step 1: Group shapes by image URL (shapes in same selection share URL)
	urlToGroup := p.groupShapesByURL(metadata.ShapeImageUrls)

	// Step 2: Collect all shape UUIDs and fetch from DB
	shapeDataMap := p.fetchShapeDataFromDB(metadata.ShapeImageUrls)

	// Step 3: Fetch images and annotate each selection group
	annotatedSelections := p.annotateSelectionGroups(urlToGroup, shapeDataMap)

	log.Printf("Created %d annotated selections", len(annotatedSelections))
	return annotatedSelections
}

// groupShapesByURL groups shapes by their image URL
func (p *ImageProcessor) groupShapesByURL(shapeUrls []libraries.ShapeImageUrl) map[string]*selectionGroup {
	urlToGroup := make(map[string]*selectionGroup)
	for _, shapeUrl := range shapeUrls {
		if group, exists := urlToGroup[shapeUrl.Url]; exists {
			group.shapes = append(group.shapes, shapeUrl)
		} else {
			urlToGroup[shapeUrl.Url] = &selectionGroup{
				url:    shapeUrl.Url,
				bounds: shapeUrl.Bounds,
				shapes: []libraries.ShapeImageUrl{shapeUrl},
			}
		}
	}
	return urlToGroup
}

// fetchShapeDataFromDB fetches full shape data from the database
func (p *ImageProcessor) fetchShapeDataFromDB(shapeUrls []libraries.ShapeImageUrl) map[string]map[string]any {
	shapeDataMap := make(map[string]map[string]any)

	if p.boardDataRepo == nil {
		return shapeDataMap
	}

	// Collect all shape UUIDs
	var allShapeUUIDs []uuid.UUID
	for _, shapeUrl := range shapeUrls {
		if shapeUUID, err := uuid.Parse(shapeUrl.ShapeId); err == nil {
			allShapeUUIDs = append(allShapeUUIDs, shapeUUID)
		}
	}

	if len(allShapeUUIDs) == 0 {
		return shapeDataMap
	}

	// Fetch from DB
	dbShapes, err := p.boardDataRepo.GetShapesByUUIDs(allShapeUUIDs)
	if err != nil {
		log.Printf("Warning: Failed to fetch shape data from DB: %v", err)
		return shapeDataMap
	}

	for _, shape := range dbShapes {
		var data map[string]any
		if err := json.Unmarshal(shape.Data, &data); err == nil {
			data["type"] = string(shape.Type)
			data["id"] = shape.UUID.String()
			shapeDataMap[shape.UUID.String()] = data
		}
	}
	log.Printf("Fetched %d shapes with full data from DB", len(dbShapes))

	return shapeDataMap
}

// annotateSelectionGroups processes each selection group and creates annotated selections
func (p *ImageProcessor) annotateSelectionGroups(urlToGroup map[string]*selectionGroup, shapeDataMap map[string]map[string]any) []helpers.AnnotatedSelection {
	var annotatedSelections []helpers.AnnotatedSelection
	globalShapeNumber := 1

	for _, group := range urlToGroup {
		// Fetch the image
		imageBase64, err := p.fetchImageAsBase64(group.url)
		if err != nil {
			log.Printf("Failed to fetch image: %v", err)
			continue
		}

		// Build shapes arrays
		shapesForAnnotation, shapeImages, shapesForToon := p.buildShapeArrays(group, shapeDataMap, &globalShapeNumber)

		// Annotate the image
		annotatedImage, _, err := tools.AnnotateImageWithNumbers(imageBase64, shapesForAnnotation)
		if err != nil {
			log.Printf("Warning: Failed to annotate image: %v, using original", err)
			annotatedImage = imageBase64
		}

		// Format with TOON using gotoon library
		shapeMetadata := p.encodeShapesAsToon(shapesForToon)

		annotatedSelections = append(annotatedSelections, helpers.AnnotatedSelection{
			AnnotatedImage: annotatedImage,
			MimeType:       "image/png",
			Shapes:         shapeImages,
			ShapeMetadata:  shapeMetadata,
		})
	}

	return annotatedSelections
}

// fetchImageAsBase64 fetches an image from a URL and returns it as base64
func (p *ImageProcessor) fetchImageAsBase64(url string) (string, error) {
	log.Printf("Fetching image from URL: %s", url)
	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("HTTP GET failed: %w", err)
	}
	defer resp.Body.Close()

	// Check for successful response
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP request failed with status %d: %s", resp.StatusCode, resp.Status)
	}

	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	log.Printf("Successfully fetched image, size: %d bytes", len(imageData))

	return base64.StdEncoding.EncodeToString(imageData), nil
}

// buildShapeArrays builds the various shape arrays needed for annotation and metadata
func (p *ImageProcessor) buildShapeArrays(group *selectionGroup, shapeDataMap map[string]map[string]any, globalShapeNumber *int) ([]map[string]any, []helpers.ShapeImage, []map[string]any) {
	var shapesForAnnotation []map[string]any
	var shapeImages []helpers.ShapeImage
	var shapesForToon []map[string]any

	for _, shapeUrl := range group.shapes {
		shapeData := shapeDataMap[shapeUrl.ShapeId]
		if shapeData == nil {
			shapeData = map[string]any{"type": "unknown", "id": shapeUrl.ShapeId}
		}

		// Translate coordinates relative to selection bounds
		translatedData := make(map[string]any)
		for k, v := range shapeData {
			translatedData[k] = v
		}

		if group.bounds != nil {
			if x, ok := shapeData["x"].(float64); ok {
				translatedData["x"] = x - group.bounds.MinX + group.bounds.Padding
			}
			if y, ok := shapeData["y"].(float64); ok {
				translatedData["y"] = y - group.bounds.MinY + group.bounds.Padding
			}
		}

		// Add annotation number
		translatedData["number"] = *globalShapeNumber

		shapesForAnnotation = append(shapesForAnnotation, translatedData)

		// Build ShapeImage
		shapeImages = append(shapeImages, helpers.ShapeImage{
			ShapeId:   shapeUrl.ShapeId,
			MimeType:  "image/png",
			ShapeData: shapeData,
			Number:    *globalShapeNumber,
		})

		// Build shape data for TOON encoding - MINIMAL data only
		shapesForToon = append(shapesForToon, map[string]any{
			"n":    *globalShapeNumber,
			"type": shapeData["type"],
			"id":   shapeUrl.ShapeId,
		})

		*globalShapeNumber++
	}

	return shapesForAnnotation, shapeImages, shapesForToon
}

// encodeShapesAsToon encodes shape data using gotoon format
func (p *ImageProcessor) encodeShapesAsToon(shapesForToon []map[string]any) string {
	toonData := map[string]any{"shapes": shapesForToon}
	shapeMetadata, err := gotoon.Encode(toonData)
	if err != nil {
		log.Printf("Warning: Failed to encode TOON: %v", err)
		return fmt.Sprintf("shapes: %v", shapesForToon)
	}
	return shapeMetadata
}

// ProcessUploadedImages fetches uploaded images and returns as base64 (no annotation)
func (p *ImageProcessor) ProcessUploadedImages(urls []string) []helpers.UploadedImage {
	if len(urls) == 0 {
		return nil
	}

	log.Printf("Processing %d uploaded images", len(urls))

	var images []helpers.UploadedImage
	for _, url := range urls {
		base64Data, err := p.fetchImageAsBase64(url)
		if err != nil {
			log.Printf("Failed to fetch uploaded image from %s: %v", url, err)
			continue
		}

		// Detect mime type from URL or default to jpeg
		mimeType := "image/jpeg"
		lowerUrl := strings.ToLower(url)
		if strings.HasSuffix(lowerUrl, ".png") {
			mimeType = "image/png"
		} else if strings.HasSuffix(lowerUrl, ".gif") {
			mimeType = "image/gif"
		} else if strings.HasSuffix(lowerUrl, ".webp") {
			mimeType = "image/webp"
		}

		images = append(images, helpers.UploadedImage{
			Base64Data: base64Data,
			MimeType:   mimeType,
		})
	}

	log.Printf("Successfully processed %d uploaded images", len(images))
	return images
}
