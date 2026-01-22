package tools

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"

	"github.com/google/uuid"
)

const annotatedImageDir = "temp/annotated_images"

// ComputeShapesHash computes a hash of the shapes data for cache invalidation
// The hash includes annotation numbers and shape positions to detect changes
func ComputeShapesHash(shapes []models.BoardData) string {
	// Sort shapes by annotation number for consistent hashing
	sortedShapes := make([]models.BoardData, len(shapes))
	copy(sortedShapes, shapes)
	sort.Slice(sortedShapes, func(i, j int) bool {
		return sortedShapes[i].AnnotationNumber < sortedShapes[j].AnnotationNumber
	})

	// Build a simplified representation for hashing
	hashData := make([]map[string]interface{}, 0, len(sortedShapes))
	for _, shape := range sortedShapes {
		var data map[string]interface{}
		if err := json.Unmarshal(shape.Data, &data); err != nil {
			continue
		}

		// Include fields that affect the annotation position
		entry := map[string]interface{}{
			"uuid":              shape.UUID.String(),
			"type":              string(shape.Type),
			"annotation_number": shape.AnnotationNumber,
		}

		// Include position-related fields
		for _, key := range []string{"x", "y", "w", "h", "r", "points"} {
			if v, ok := data[key]; ok {
				entry[key] = v
			}
		}

		hashData = append(hashData, entry)
	}

	// Serialize and hash
	jsonBytes, err := json.Marshal(hashData)
	if err != nil {
		return ""
	}

	hash := sha256.Sum256(jsonBytes)
	return hex.EncodeToString(hash[:])
}

// GetAnnotatedImagePath returns the path for a board's cached annotated image
func GetAnnotatedImagePath(boardId string) string {
	return filepath.Join(annotatedImageDir, boardId+".png")
}

// EnsureAnnotatedImageDir ensures the annotated images directory exists
func EnsureAnnotatedImageDir() error {
	return os.MkdirAll(annotatedImageDir, 0755)
}

// SaveAnnotatedImage saves the annotated image to the cache
func SaveAnnotatedImage(boardId string, imageBase64 string) error {
	if err := EnsureAnnotatedImageDir(); err != nil {
		return fmt.Errorf("failed to create cache directory: %w", err)
	}

	imageData, err := base64.StdEncoding.DecodeString(imageBase64)
	if err != nil {
		return fmt.Errorf("failed to decode image: %w", err)
	}

	path := GetAnnotatedImagePath(boardId)
	if err := os.WriteFile(path, imageData, 0644); err != nil {
		return fmt.Errorf("failed to write cache file: %w", err)
	}

	return nil
}

// LoadAnnotatedImage loads the cached annotated image if it exists
func LoadAnnotatedImage(boardId string) (string, error) {
	path := GetAnnotatedImagePath(boardId)
	imageData, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(imageData), nil
}

// DeleteAnnotatedImage removes the cached annotated image
func DeleteAnnotatedImage(boardId string) error {
	path := GetAnnotatedImagePath(boardId)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// InvalidateAnnotatedImageCache marks the board's annotated image cache as invalid
// by clearing the hash in the database
func InvalidateAnnotatedImageCache(userId uuid.UUID, boardId uuid.UUID) error {
	boardRepo := repo.NewBoardRepository(config.DB)
	return boardRepo.UpdateBoard(userId, boardId, &models.Board{
		AnnotatedImageHash: "",
	})
}

// GetOrCreateAnnotatedImage checks the cache and returns the annotated image
// If the cache is invalid or doesn't exist, it generates a new annotated image
func GetOrCreateAnnotatedImage(userId uuid.UUID, boardId string, shapes []models.BoardData, originalImageBase64 string) (string, error) {
	boardIdUUID, err := uuid.Parse(boardId)
	if err != nil {
		return "", fmt.Errorf("invalid boardId: %w", err)
	}

	// Compute current shapes hash
	currentHash := ComputeShapesHash(shapes)

	// Get the board to check stored hash
	boardRepo := repo.NewBoardRepository(config.DB)
	board, err := boardRepo.GetBoardById(userId, boardIdUUID)
	if err != nil {
		return "", fmt.Errorf("failed to get board: %w", err)
	}

	// Check if cache is valid
	if board.AnnotatedImageHash == currentHash && currentHash != "" {
		// Try to load from cache
		cachedImage, err := LoadAnnotatedImage(boardId)
		if err == nil {
			return cachedImage, nil
		}
		// Cache file missing, will regenerate
	}

	// Convert shapes to the format expected by AnnotateImage
	shapeMaps := make([]map[string]interface{}, 0, len(shapes))
	for _, shape := range shapes {
		var dataMap map[string]interface{}
		if err := json.Unmarshal(shape.Data, &dataMap); err != nil {
			continue
		}

		shapeMap := map[string]interface{}{
			"id":     shape.UUID.String(),
			"type":   string(shape.Type),
			"number": shape.AnnotationNumber,
		}

		// Copy position data
		for k, v := range dataMap {
			shapeMap[k] = v
		}

		shapeMaps = append(shapeMaps, shapeMap)
	}

	// Sort by annotation number for consistent badge ordering
	sort.Slice(shapeMaps, func(i, j int) bool {
		numI, _ := shapeMaps[i]["number"].(int)
		numJ, _ := shapeMaps[j]["number"].(int)
		return numI < numJ
	})

	// Generate annotated image
	annotatedImage, _, err := AnnotateImageWithNumbers(originalImageBase64, shapeMaps)
	if err != nil {
		return "", fmt.Errorf("failed to annotate image: %w", err)
	}

	// Save to cache
	if err := SaveAnnotatedImage(boardId, annotatedImage); err != nil {
		// Log but don't fail - caching is optional
		fmt.Printf("Warning: failed to cache annotated image: %v\n", err)
	}

	// Update hash in database
	if err := boardRepo.UpdateBoard(userId, boardIdUUID, &models.Board{
		AnnotatedImageHash: currentHash,
	}); err != nil {
		fmt.Printf("Warning: failed to update annotated image hash: %v\n", err)
	}

	return annotatedImage, nil
}
