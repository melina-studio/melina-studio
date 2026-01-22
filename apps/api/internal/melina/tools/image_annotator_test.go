package tools

import (
	"encoding/base64"
	"image"
	"image/color"
	"image/png"
	"bytes"
	"testing"
)

// createTestImage creates a simple test PNG image
func createTestImage(width, height int) string {
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	// Fill with white background
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.White)
		}
	}

	var buf bytes.Buffer
	png.Encode(&buf, img)
	return base64.StdEncoding.EncodeToString(buf.Bytes())
}

func TestCalculateShapeCenter_Rect(t *testing.T) {
	data := map[string]interface{}{
		"x": 100.0,
		"y": 50.0,
		"w": 200.0,
		"h": 150.0,
	}

	centerX, centerY, ok := CalculateShapeCenter("rect", data)
	if !ok {
		t.Fatal("Expected center calculation to succeed")
	}

	expectedX := 200.0 // 100 + 200/2
	expectedY := 125.0 // 50 + 150/2

	if centerX != expectedX {
		t.Errorf("Expected centerX %f, got %f", expectedX, centerX)
	}
	if centerY != expectedY {
		t.Errorf("Expected centerY %f, got %f", expectedY, centerY)
	}
}

func TestCalculateShapeCenter_Circle(t *testing.T) {
	data := map[string]interface{}{
		"x": 150.0,
		"y": 100.0,
		"r": 50.0,
	}

	centerX, centerY, ok := CalculateShapeCenter("circle", data)
	if !ok {
		t.Fatal("Expected center calculation to succeed")
	}

	// Circle center is (x, y) directly
	if centerX != 150.0 {
		t.Errorf("Expected centerX 150, got %f", centerX)
	}
	if centerY != 100.0 {
		t.Errorf("Expected centerY 100, got %f", centerY)
	}
}

func TestCalculateShapeCenter_Line(t *testing.T) {
	// Line/arrow shapes have x, y offset + relative points
	data := map[string]interface{}{
		"x":      10.0,
		"y":      20.0,
		"points": []interface{}{0.0, 0.0, 100.0, 100.0},
	}

	centerX, centerY, ok := CalculateShapeCenter("line", data)
	if !ok {
		t.Fatal("Expected center calculation to succeed")
	}

	// Midpoint of bounding box + offset
	expectedX := 10.0 + 50.0 // offset + (0+100)/2
	expectedY := 20.0 + 50.0 // offset + (0+100)/2

	if centerX != expectedX {
		t.Errorf("Expected centerX %f, got %f", expectedX, centerX)
	}
	if centerY != expectedY {
		t.Errorf("Expected centerY %f, got %f", expectedY, centerY)
	}
}

func TestCalculateShapeCenter_Pencil(t *testing.T) {
	// Pencil shapes have ABSOLUTE points (no x, y offset)
	data := map[string]interface{}{
		"points": []interface{}{100.0, 100.0, 200.0, 150.0, 150.0, 200.0},
	}

	centerX, centerY, ok := CalculateShapeCenter("pencil", data)
	if !ok {
		t.Fatal("Expected center calculation to succeed")
	}

	// Center of bounding box: x=[100,200], y=[100,200]
	expectedX := 150.0 // (100+200)/2
	expectedY := 150.0 // (100+200)/2

	if centerX != expectedX {
		t.Errorf("Expected centerX %f, got %f", expectedX, centerX)
	}
	if centerY != expectedY {
		t.Errorf("Expected centerY %f, got %f", expectedY, centerY)
	}
}

func TestCalculateShapeCenter_Polygon(t *testing.T) {
	// Triangle vertices
	data := map[string]interface{}{
		"x":      0.0,
		"y":      0.0,
		"points": []interface{}{0.0, 0.0, 100.0, 0.0, 50.0, 100.0},
	}

	centerX, centerY, ok := CalculateShapeCenter("polygon", data)
	if !ok {
		t.Fatal("Expected center calculation to succeed")
	}

	// Centroid: (0+100+50)/3, (0+0+100)/3 = 50, 33.33...
	expectedX := 50.0
	expectedY := 100.0 / 3.0

	if centerX != expectedX {
		t.Errorf("Expected centerX %f, got %f", expectedX, centerX)
	}
	if centerY != expectedY {
		t.Errorf("Expected centerY %f, got %f", expectedY, centerY)
	}
}

func TestAnnotateImage_BasicShapes(t *testing.T) {
	// Create a 500x400 test image
	imageBase64 := createTestImage(500, 400)

	shapes := []map[string]interface{}{
		{
			"id":   "shape-1",
			"type": "rect",
			"x":    100.0,
			"y":    50.0,
			"w":    100.0,
			"h":    80.0,
		},
		{
			"id":   "shape-2",
			"type": "circle",
			"x":    300.0,
			"y":    150.0,
			"r":    40.0,
		},
	}

	annotatedBase64, centers, err := AnnotateImage(imageBase64, shapes)
	if err != nil {
		t.Fatalf("AnnotateImage failed: %v", err)
	}

	// Verify we got a valid base64 result
	if annotatedBase64 == "" {
		t.Error("Expected non-empty annotated image")
	}

	// Verify centers were calculated
	if len(centers) != 2 {
		t.Errorf("Expected 2 centers, got %d", len(centers))
	}

	// Verify badge numbers
	if centers[0].Number != 1 {
		t.Errorf("Expected first badge number 1, got %d", centers[0].Number)
	}
	if centers[1].Number != 2 {
		t.Errorf("Expected second badge number 2, got %d", centers[1].Number)
	}

	// Decode the annotated image to verify it's valid
	decoded, err := base64.StdEncoding.DecodeString(annotatedBase64)
	if err != nil {
		t.Fatalf("Failed to decode annotated image base64: %v", err)
	}

	_, err = png.Decode(bytes.NewReader(decoded))
	if err != nil {
		t.Fatalf("Failed to decode annotated PNG: %v", err)
	}
}

func TestAnnotateImage_EdgeCases(t *testing.T) {
	imageBase64 := createTestImage(200, 200)

	// Shape with center near edge should be clamped
	shapes := []map[string]interface{}{
		{
			"id":   "edge-shape",
			"type": "rect",
			"x":    0.0,
			"y":    0.0,
			"w":    20.0,
			"h":    20.0,
		},
	}

	annotatedBase64, centers, err := AnnotateImage(imageBase64, shapes)
	if err != nil {
		t.Fatalf("AnnotateImage failed: %v", err)
	}

	if len(centers) != 1 {
		t.Errorf("Expected 1 center, got %d", len(centers))
	}

	// Center should be clamped to be within bounds
	// Badge radius (16) + border (2) = 18 pixels padding
	if centers[0].X < 18 {
		t.Errorf("Expected X to be at least 18 (padding), got %f", centers[0].X)
	}
	if centers[0].Y < 18 {
		t.Errorf("Expected Y to be at least 18 (padding), got %f", centers[0].Y)
	}

	// Verify valid output
	if annotatedBase64 == "" {
		t.Error("Expected non-empty annotated image")
	}
}

func TestAnnotateImage_NoShapes(t *testing.T) {
	imageBase64 := createTestImage(200, 200)

	shapes := []map[string]interface{}{}

	annotatedBase64, centers, err := AnnotateImage(imageBase64, shapes)
	if err != nil {
		t.Fatalf("AnnotateImage failed: %v", err)
	}

	if len(centers) != 0 {
		t.Errorf("Expected 0 centers, got %d", len(centers))
	}

	// Image should still be valid
	if annotatedBase64 == "" {
		t.Error("Expected non-empty annotated image")
	}
}

func TestAnnotateImage_InvalidShapeData(t *testing.T) {
	imageBase64 := createTestImage(200, 200)

	// Shape without coordinates
	shapes := []map[string]interface{}{
		{
			"id":   "invalid-shape",
			"type": "rect",
			// missing x, y, w, h
		},
	}

	annotatedBase64, centers, err := AnnotateImage(imageBase64, shapes)
	if err != nil {
		t.Fatalf("AnnotateImage should not fail on invalid shape data: %v", err)
	}

	// Shape without coords should be skipped
	if len(centers) != 0 {
		t.Errorf("Expected 0 centers for invalid shape, got %d", len(centers))
	}

	if annotatedBase64 == "" {
		t.Error("Expected non-empty annotated image")
	}
}
