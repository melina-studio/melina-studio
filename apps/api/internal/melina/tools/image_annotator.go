package tools

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image/color"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"strconv"

	"github.com/fogleman/gg"
)

// BadgeConfig holds styling configuration for badges
type BadgeConfig struct {
	Radius          float64
	BackgroundColor color.Color
	TextColor       color.Color
	BorderColor     color.Color
	BorderWidth     float64
	FontSize        float64
}

// DefaultBadgeConfig returns the default badge styling
func DefaultBadgeConfig() BadgeConfig {
	return BadgeConfig{
		Radius:          16,
		BackgroundColor: color.RGBA{255, 87, 34, 255},   // Orange-red (#FF5722)
		TextColor:       color.RGBA{255, 255, 255, 255}, // White
		BorderColor:     color.RGBA{255, 255, 255, 255}, // White border
		BorderWidth:     2,
		FontSize:        12,
	}
}

// ShapeCenter represents the center point and number for a shape
type ShapeCenter struct {
	Number int
	X      float64
	Y      float64
}

// CalculateShapeCenter calculates the center point for a shape based on its type and properties
func CalculateShapeCenter(shapeType string, data map[string]interface{}) (float64, float64, bool) {
	getFloat := func(key string) (float64, bool) {
		if v, ok := data[key]; ok {
			switch val := v.(type) {
			case float64:
				return val, true
			case int:
				return float64(val), true
			case int64:
				return float64(val), true
			}
		}
		return 0, false
	}

	getFloatSlice := func(key string) ([]float64, bool) {
		if v, ok := data[key]; ok {
			switch arr := v.(type) {
			case []interface{}:
				result := make([]float64, 0, len(arr))
				for _, item := range arr {
					switch val := item.(type) {
					case float64:
						result = append(result, val)
					case int:
						result = append(result, float64(val))
					case int64:
						result = append(result, float64(val))
					}
				}
				return result, len(result) > 0
			case []float64:
				return arr, len(arr) > 0
			}
		}
		return nil, false
	}

	switch shapeType {
	case "rect", "ellipse", "image":
		// Center is (x + w/2, y + h/2)
		x, hasX := getFloat("x")
		y, hasY := getFloat("y")
		w, hasW := getFloat("w")
		h, hasH := getFloat("h")
		if hasX && hasY {
			centerX := x
			centerY := y
			if hasW {
				centerX += w / 2
			}
			if hasH {
				centerY += h / 2
			}
			return centerX, centerY, true
		}

	case "circle":
		// For circle, (x, y) is already the center
		x, hasX := getFloat("x")
		y, hasY := getFloat("y")
		if hasX && hasY {
			return x, y, true
		}

	case "line", "arrow":
		// Use midpoint of bounding box of points
		points, hasPoints := getFloatSlice("points")
		x, hasX := getFloat("x")
		y, hasY := getFloat("y")
		if hasPoints && len(points) >= 4 {
			// points are relative to shape's x, y
			offsetX := 0.0
			offsetY := 0.0
			if hasX {
				offsetX = x
			}
			if hasY {
				offsetY = y
			}
			// Find bounding box of all points
			minX, maxX := points[0], points[0]
			minY, maxY := points[1], points[1]
			for i := 0; i < len(points)-1; i += 2 {
				px, py := points[i], points[i+1]
				if px < minX {
					minX = px
				}
				if px > maxX {
					maxX = px
				}
				if py < minY {
					minY = py
				}
				if py > maxY {
					maxY = py
				}
			}
			return offsetX + (minX+maxX)/2, offsetY + (minY+maxY)/2, true
		}

	case "pencil", "eraser":
		// Pencil/eraser points are ABSOLUTE coordinates (no x, y offset)
		// The points array contains [x1, y1, x2, y2, ...] in absolute canvas coordinates
		points, hasPoints := getFloatSlice("points")
		if hasPoints && len(points) >= 2 {
			minX, maxX := points[0], points[0]
			minY, maxY := points[1], points[1]
			for i := 0; i < len(points)-1; i += 2 {
				px, py := points[i], points[i+1]
				if px < minX {
					minX = px
				}
				if px > maxX {
					maxX = px
				}
				if py < minY {
					minY = py
				}
				if py > maxY {
					maxY = py
				}
			}
			// Return center of bounding box (no offset needed - points are absolute)
			return (minX + maxX) / 2, (minY + maxY) / 2, true
		}

	case "polygon":
		// Centroid of polygon vertices
		points, hasPoints := getFloatSlice("points")
		x, hasX := getFloat("x")
		y, hasY := getFloat("y")
		if hasPoints && len(points) >= 4 {
			offsetX := 0.0
			offsetY := 0.0
			if hasX {
				offsetX = x
			}
			if hasY {
				offsetY = y
			}
			sumX, sumY := 0.0, 0.0
			numPoints := len(points) / 2
			for i := 0; i < len(points)-1; i += 2 {
				sumX += points[i]
				sumY += points[i+1]
			}
			return offsetX + sumX/float64(numPoints), offsetY + sumY/float64(numPoints), true
		}

	case "text":
		// Text shapes have x, y as the top-left position
		// We place the badge slightly to the left and above the text
		x, hasX := getFloat("x")
		y, hasY := getFloat("y")
		if hasX && hasY {
			// Place badge at the start of the text (top-left corner with small offset)
			// This makes it clear which text element is being referenced
			return x, y, true
		}
	}

	// Fallback: try to use x, y directly
	x, hasX := getFloat("x")
	y, hasY := getFloat("y")
	if hasX && hasY {
		return x, y, true
	}

	return 0, 0, false
}

// getFontPath returns the absolute path to the font file
func getFontPath() string {
	// Get the directory of the current Go file
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return "assets/fonts/Roboto-Bold.ttf"
	}

	// Navigate from internal/melina/tools/ to the project root
	dir := filepath.Dir(currentFile)
	// Go up three directories: tools -> melina -> internal -> project root
	projectRoot := filepath.Join(dir, "..", "..", "..")
	return filepath.Join(projectRoot, "assets", "fonts", "Roboto-Bold.ttf")
}

// AnnotateImage takes a base64-encoded PNG image and shapes data,
// draws numbered badges at each shape's center, and returns the annotated base64 image
func AnnotateImage(imageBase64 string, shapes []map[string]interface{}) (string, []ShapeCenter, error) {
	// Decode base64 image
	imageData, err := base64.StdEncoding.DecodeString(imageBase64)
	if err != nil {
		return "", nil, fmt.Errorf("failed to decode base64 image: %w", err)
	}

	// Decode PNG
	img, err := png.Decode(bytes.NewReader(imageData))
	if err != nil {
		return "", nil, fmt.Errorf("failed to decode PNG: %w", err)
	}

	// Create drawing context
	bounds := img.Bounds()
	dc := gg.NewContext(bounds.Dx(), bounds.Dy())
	dc.DrawImage(img, 0, 0)

	// Load font
	fontPath := getFontPath()
	config := DefaultBadgeConfig()

	// Try to load the font, use default if not available
	if _, err := os.Stat(fontPath); err == nil {
		if err := dc.LoadFontFace(fontPath, config.FontSize); err != nil {
			// Font loading failed, will use default
			fmt.Printf("Warning: Could not load font from %s: %v\n", fontPath, err)
		}
	}

	// Calculate centers and draw badges
	centers := make([]ShapeCenter, 0, len(shapes))
	imgWidth := float64(bounds.Dx())
	imgHeight := float64(bounds.Dy())

	for i, shape := range shapes {
		shapeType, ok := shape["type"].(string)
		if !ok {
			continue
		}

		// Get shape data (could be nested or flat)
		data := shape
		if nestedData, ok := shape["data"].(map[string]interface{}); ok {
			data = nestedData
		}

		centerX, centerY, ok := CalculateShapeCenter(shapeType, data)
		if !ok {
			continue
		}

		// Clamp badge position to image bounds with padding
		padding := config.Radius + config.BorderWidth
		centerX = math.Max(padding, math.Min(centerX, imgWidth-padding))
		centerY = math.Max(padding, math.Min(centerY, imgHeight-padding))

		number := i + 1
		centers = append(centers, ShapeCenter{
			Number: number,
			X:      centerX,
			Y:      centerY,
		})

		// Draw the badge
		drawBadge(dc, centerX, centerY, number, config)
	}

	// Encode result to PNG
	var buf bytes.Buffer
	if err := png.Encode(&buf, dc.Image()); err != nil {
		return "", nil, fmt.Errorf("failed to encode annotated image: %w", err)
	}

	// Return base64 encoded result
	annotatedBase64 := base64.StdEncoding.EncodeToString(buf.Bytes())
	return annotatedBase64, centers, nil
}

// drawBadge draws a numbered badge at the specified position
func drawBadge(dc *gg.Context, x, y float64, number int, config BadgeConfig) {
	// Adjust radius for multi-digit numbers
	numStr := strconv.Itoa(number)
	radius := config.Radius
	if len(numStr) > 1 {
		radius = config.Radius + float64(len(numStr)-1)*4
	}

	// Draw border circle
	dc.SetColor(config.BorderColor)
	dc.DrawCircle(x, y, radius+config.BorderWidth)
	dc.Fill()

	// Draw background circle
	dc.SetColor(config.BackgroundColor)
	dc.DrawCircle(x, y, radius)
	dc.Fill()

	// Draw number text
	dc.SetColor(config.TextColor)
	dc.DrawStringAnchored(numStr, x, y, 0.5, 0.5)
}

// AnnotateImageFromFile reads an image file, annotates it, and returns the base64 result
// This is a convenience function for when you have a file path instead of base64
func AnnotateImageFromFile(imagePath string, shapes []map[string]interface{}) (string, []ShapeCenter, error) {
	imageData, err := os.ReadFile(imagePath)
	if err != nil {
		return "", nil, fmt.Errorf("failed to read image file: %w", err)
	}

	imageBase64 := base64.StdEncoding.EncodeToString(imageData)
	return AnnotateImage(imageBase64, shapes)
}

// AnnotateImageWithNumbers annotates an image using pre-assigned annotation numbers
// This is the optimized version that uses numbers stored in the database
// Each shape map must have a "number" field with the annotation number
// Note: The frontend exports images at 2x pixelRatio, so coordinates must be scaled
func AnnotateImageWithNumbers(imageBase64 string, shapes []map[string]interface{}) (string, []ShapeCenter, error) {
	// Decode base64 image
	imageData, err := base64.StdEncoding.DecodeString(imageBase64)
	if err != nil {
		return "", nil, fmt.Errorf("failed to decode base64 image: %w", err)
	}

	// Decode PNG
	img, err := png.Decode(bytes.NewReader(imageData))
	if err != nil {
		return "", nil, fmt.Errorf("failed to decode PNG: %w", err)
	}

	// Create drawing context
	bounds := img.Bounds()
	dc := gg.NewContext(bounds.Dx(), bounds.Dy())
	dc.DrawImage(img, 0, 0)

	// The frontend exports images at 2x pixelRatio (see helpers.ts)
	// Shape coordinates are in canvas units, but the image is 2x larger
	pixelRatio := 2.0

	// Load font - scale font size for higher resolution image
	fontPath := getFontPath()
	config := DefaultBadgeConfig()
	config.Radius *= pixelRatio
	config.BorderWidth *= pixelRatio
	config.FontSize *= pixelRatio

	// Try to load the font, use default if not available
	if _, err := os.Stat(fontPath); err == nil {
		if err := dc.LoadFontFace(fontPath, config.FontSize); err != nil {
			fmt.Printf("Warning: Could not load font from %s: %v\n", fontPath, err)
		}
	}

	// Calculate centers and draw badges
	centers := make([]ShapeCenter, 0, len(shapes))
	imgWidth := float64(bounds.Dx())
	imgHeight := float64(bounds.Dy())

	for _, shape := range shapes {
		shapeType, ok := shape["type"].(string)
		if !ok {
			continue
		}

		// Get the annotation number from the shape
		number := 0
		if num, ok := shape["number"].(int); ok {
			number = num
		} else if numFloat, ok := shape["number"].(float64); ok {
			number = int(numFloat)
		}

		if number <= 0 {
			continue // Skip shapes without valid annotation numbers
		}

		// Get shape data (could be nested or flat)
		data := shape
		if nestedData, ok := shape["data"].(map[string]interface{}); ok {
			data = nestedData
		}

		centerX, centerY, ok := CalculateShapeCenter(shapeType, data)
		if !ok {
			continue
		}

		// Scale coordinates to match the 2x image resolution
		centerX *= pixelRatio
		centerY *= pixelRatio

		// Clamp badge position to image bounds with padding
		padding := config.Radius + config.BorderWidth
		centerX = math.Max(padding, math.Min(centerX, imgWidth-padding))
		centerY = math.Max(padding, math.Min(centerY, imgHeight-padding))

		centers = append(centers, ShapeCenter{
			Number: number,
			X:      centerX,
			Y:      centerY,
		})

		// Draw the badge with the stored annotation number
		drawBadge(dc, centerX, centerY, number, config)
	}

	// Encode result to PNG
	var buf bytes.Buffer
	if err := png.Encode(&buf, dc.Image()); err != nil {
		return "", nil, fmt.Errorf("failed to encode annotated image: %w", err)
	}

	// Return base64 encoded result
	annotatedBase64 := base64.StdEncoding.EncodeToString(buf.Bytes())
	return annotatedBase64, centers, nil
}
