package tools

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"

	"melina-studio-backend/internal/models"
)

// BoundingBox represents a rectangular region
type BoundingBox struct {
	MinX float64
	MinY float64
	MaxX float64
	MaxY float64
}

// OccupiedRegion represents a cluster of shapes with a bounding box
type OccupiedRegion struct {
	Bounds     BoundingBox
	ShapeCount int
	Label      string // Semantic label detected from text shapes (e.g., "SHALLOW COPY")
}

// CanvasState represents the spatial state of the canvas
type CanvasState struct {
	TotalShapes     int
	OccupiedRegions []OccupiedRegion
	OverallBounds   BoundingBox
	SuggestedAreas  []string
}

// shapeWithBounds holds a shape and its computed bounding box
type shapeWithBounds struct {
	shape  models.BoardData
	bounds BoundingBox
	data   map[string]interface{}
}

// GetShapeBounds calculates the bounding box for a shape
func GetShapeBounds(shapeData models.BoardData, padding float64) (BoundingBox, map[string]interface{}, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(shapeData.Data, &data); err != nil {
		return BoundingBox{}, nil, err
	}

	bounds := BoundingBox{
		MinX: math.MaxFloat64,
		MinY: math.MaxFloat64,
		MaxX: -math.MaxFloat64,
		MaxY: -math.MaxFloat64,
	}

	// Helper to get float from data
	getFloat := func(key string, defaultVal float64) float64 {
		if v, ok := data[key]; ok {
			if f, ok := v.(float64); ok {
				return f
			}
		}
		return defaultVal
	}

	shapeType := string(shapeData.Type)

	switch shapeType {
	case "rect", "frame":
		x := getFloat("x", 0)
		y := getFloat("y", 0)
		w := getFloat("w", 100)
		h := getFloat("h", 100)
		bounds.MinX = x
		bounds.MinY = y
		bounds.MaxX = x + w
		bounds.MaxY = y + h

	case "circle":
		x := getFloat("x", 0)
		y := getFloat("y", 0)
		r := getFloat("r", 50)
		bounds.MinX = x - r
		bounds.MinY = y - r
		bounds.MaxX = x + r
		bounds.MaxY = y + r

	case "ellipse":
		x := getFloat("x", 0)
		y := getFloat("y", 0)
		radiusX := getFloat("radiusX", 50)
		radiusY := getFloat("radiusY", 50)
		// Also check for w/h style ellipse
		if radiusX == 50 {
			radiusX = getFloat("w", 50) / 2
		}
		if radiusY == 50 {
			radiusY = getFloat("h", 50) / 2
		}
		bounds.MinX = x - radiusX
		bounds.MinY = y - radiusY
		bounds.MaxX = x + radiusX
		bounds.MaxY = y + radiusY

	case "line", "arrow", "pencil", "polygon":
		// Get points array
		if pointsRaw, ok := data["points"]; ok {
			var points []float64
			switch p := pointsRaw.(type) {
			case []interface{}:
				for _, v := range p {
					if f, ok := v.(float64); ok {
						points = append(points, f)
					}
				}
			case []float64:
				points = p
			}

			if len(points) >= 2 {
				// Get offset x,y if present
				offsetX := getFloat("x", 0)
				offsetY := getFloat("y", 0)

				for i := 0; i < len(points); i += 2 {
					px := points[i] + offsetX
					py := points[i+1] + offsetY
					bounds.MinX = math.Min(bounds.MinX, px)
					bounds.MinY = math.Min(bounds.MinY, py)
					bounds.MaxX = math.Max(bounds.MaxX, px)
					bounds.MaxY = math.Max(bounds.MaxY, py)
				}
			}
		}

		// Fallback if no points found
		if bounds.MinX == math.MaxFloat64 {
			x := getFloat("x", 0)
			y := getFloat("y", 0)
			bounds.MinX = x
			bounds.MinY = y
			bounds.MaxX = x + 100
			bounds.MaxY = y + 100
		}

	case "text":
		x := getFloat("x", 0)
		y := getFloat("y", 0)
		fontSize := getFloat("fontSize", 16)
		text := ""
		if t, ok := data["text"].(string); ok {
			text = t
		}
		// Estimate text dimensions
		lines := strings.Split(text, "\n")
		maxLineLen := 0
		for _, line := range lines {
			if len(line) > maxLineLen {
				maxLineLen = len(line)
			}
		}
		estimatedWidth := float64(maxLineLen) * fontSize * 0.6
		if estimatedWidth < 50 {
			estimatedWidth = 50
		}
		estimatedHeight := float64(len(lines)) * fontSize * 1.4
		bounds.MinX = x
		bounds.MinY = y
		bounds.MaxX = x + estimatedWidth
		bounds.MaxY = y + estimatedHeight

	case "path":
		// SVG paths are complex - use x,y position and estimate size
		x := getFloat("x", 0)
		y := getFloat("y", 0)
		// Default path size estimate
		bounds.MinX = x
		bounds.MinY = y
		bounds.MaxX = x + 100
		bounds.MaxY = y + 100

	case "image":
		x := getFloat("x", 0)
		y := getFloat("y", 0)
		w := getFloat("width", 150)
		h := getFloat("height", 150)
		bounds.MinX = x
		bounds.MinY = y
		bounds.MaxX = x + w
		bounds.MaxY = y + h

	default:
		// Fallback for unknown types
		x := getFloat("x", 0)
		y := getFloat("y", 0)
		bounds.MinX = x
		bounds.MinY = y
		bounds.MaxX = x + 100
		bounds.MaxY = y + 100
	}

	// Add padding
	bounds.MinX -= padding
	bounds.MinY -= padding
	bounds.MaxX += padding
	bounds.MaxY += padding

	return bounds, data, nil
}

// boundsOverlap checks if two bounding boxes overlap or are within maxGap of each other
func boundsOverlap(a, b BoundingBox, maxGap float64) bool {
	return !(a.MaxX+maxGap < b.MinX || b.MaxX+maxGap < a.MinX ||
		a.MaxY+maxGap < b.MinY || b.MaxY+maxGap < a.MinY)
}

// mergeBounds combines two bounding boxes into one
func mergeBounds(a, b BoundingBox) BoundingBox {
	return BoundingBox{
		MinX: math.Min(a.MinX, b.MinX),
		MinY: math.Min(a.MinY, b.MinY),
		MaxX: math.Max(a.MaxX, b.MaxX),
		MaxY: math.Max(a.MaxY, b.MaxY),
	}
}

// clusterShapes groups nearby shapes into regions
func clusterShapes(shapes []shapeWithBounds, maxGap float64) [][]shapeWithBounds {
	if len(shapes) == 0 {
		return nil
	}

	// Track which shapes have been assigned to a cluster
	assigned := make([]bool, len(shapes))
	var clusters [][]shapeWithBounds

	for i := 0; i < len(shapes); i++ {
		if assigned[i] {
			continue
		}

		// Start a new cluster with this shape
		cluster := []shapeWithBounds{shapes[i]}
		assigned[i] = true
		clusterBounds := shapes[i].bounds

		// Keep expanding the cluster until no more shapes can be added
		changed := true
		for changed {
			changed = false
			for j := 0; j < len(shapes); j++ {
				if assigned[j] {
					continue
				}
				// Check if this shape overlaps with the cluster bounds
				if boundsOverlap(clusterBounds, shapes[j].bounds, maxGap) {
					cluster = append(cluster, shapes[j])
					clusterBounds = mergeBounds(clusterBounds, shapes[j].bounds)
					assigned[j] = true
					changed = true
				}
			}
		}

		clusters = append(clusters, cluster)
	}

	return clusters
}

// detectRegionLabel finds a semantic label from text shapes in the cluster
func detectRegionLabel(shapes []shapeWithBounds) string {
	var candidates []struct {
		text string
		y    float64
	}

	for _, swb := range shapes {
		if string(swb.shape.Type) != "text" {
			continue
		}
		if text, ok := swb.data["text"].(string); ok && text != "" {
			// Prefer ALL-CAPS text as labels
			trimmed := strings.TrimSpace(text)
			y := 0.0
			if yVal, ok := swb.data["y"].(float64); ok {
				y = yVal
			}
			candidates = append(candidates, struct {
				text string
				y    float64
			}{trimmed, y})
		}
	}

	if len(candidates) == 0 {
		return ""
	}

	// Sort by Y position (topmost first)
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].y < candidates[j].y
	})

	// Prefer ALL-CAPS text, or the topmost text
	for _, c := range candidates {
		if c.text == strings.ToUpper(c.text) && len(c.text) > 2 {
			return c.text
		}
	}

	// Return the topmost text if it's reasonably short (likely a title)
	if len(candidates) > 0 && len(candidates[0].text) < 50 {
		return candidates[0].text
	}

	return ""
}

// GenerateCanvasState creates a spatial awareness summary from shapes
func GenerateCanvasState(shapes []models.BoardData, padding float64, clusterGap float64) *CanvasState {
	if len(shapes) == 0 {
		return nil
	}

	// Calculate bounds for all shapes
	var shapesWithBounds []shapeWithBounds
	overallBounds := BoundingBox{
		MinX: math.MaxFloat64,
		MinY: math.MaxFloat64,
		MaxX: -math.MaxFloat64,
		MaxY: -math.MaxFloat64,
	}

	for _, shape := range shapes {
		bounds, data, err := GetShapeBounds(shape, 0) // No padding for individual shapes
		if err != nil {
			continue
		}

		shapesWithBounds = append(shapesWithBounds, shapeWithBounds{
			shape:  shape,
			bounds: bounds,
			data:   data,
		})

		// Update overall bounds
		overallBounds = mergeBounds(overallBounds, bounds)
	}

	if len(shapesWithBounds) == 0 {
		return nil
	}

	// Cluster shapes into regions
	clusters := clusterShapes(shapesWithBounds, clusterGap)

	// Build occupied regions
	var regions []OccupiedRegion
	for _, cluster := range clusters {
		if len(cluster) == 0 {
			continue
		}

		// Calculate cluster bounds with padding
		clusterBounds := cluster[0].bounds
		for _, swb := range cluster[1:] {
			clusterBounds = mergeBounds(clusterBounds, swb.bounds)
		}

		// Add padding to region
		clusterBounds.MinX -= padding
		clusterBounds.MinY -= padding
		clusterBounds.MaxX += padding
		clusterBounds.MaxY += padding

		// Detect label
		label := detectRegionLabel(cluster)

		regions = append(regions, OccupiedRegion{
			Bounds:     clusterBounds,
			ShapeCount: len(cluster),
			Label:      label,
		})
	}

	// Sort regions by position (top-left first)
	sort.Slice(regions, func(i, j int) bool {
		if regions[i].Bounds.MinY != regions[j].Bounds.MinY {
			return regions[i].Bounds.MinY < regions[j].Bounds.MinY
		}
		return regions[i].Bounds.MinX < regions[j].Bounds.MinX
	})

	// Generate suggested placement areas
	var suggestions []string
	bottomY := overallBounds.MaxY + padding
	suggestions = append(suggestions, fmt.Sprintf("Below existing content: y > %.0f", bottomY))

	rightX := overallBounds.MaxX + padding
	suggestions = append(suggestions, fmt.Sprintf("Right of existing content: x > %.0f", rightX))

	if overallBounds.MinX > 100 {
		suggestions = append(suggestions, fmt.Sprintf("Left side: x < %.0f", overallBounds.MinX-padding))
	}

	return &CanvasState{
		TotalShapes:     len(shapes),
		OccupiedRegions: regions,
		OverallBounds:   overallBounds,
		SuggestedAreas:  suggestions,
	}
}

// FormatCanvasStateXML formats the canvas state as XML for the LLM context
func FormatCanvasStateXML(state *CanvasState) string {
	if state == nil {
		return ""
	}

	var sb strings.Builder

	sb.WriteString("<CANVAS_STATE>\n")

	// Summary
	regionText := "region"
	if len(state.OccupiedRegions) != 1 {
		regionText = "regions"
	}
	sb.WriteString(fmt.Sprintf("  <SUMMARY>Board has %d shapes across %d %s</SUMMARY>\n",
		state.TotalShapes, len(state.OccupiedRegions), regionText))

	// Occupied regions
	if len(state.OccupiedRegions) > 0 {
		sb.WriteString("  <OCCUPIED_REGIONS>\n")
		for i, region := range state.OccupiedRegions {
			labelAttr := ""
			if region.Label != "" {
				labelAttr = fmt.Sprintf(" label=%q", region.Label)
			}
			sb.WriteString(fmt.Sprintf("    <REGION id=\"%d\" bounds=\"(%.0f,%.0f)-(%.0f,%.0f)\" shapes=\"%d\"%s/>\n",
				i+1, region.Bounds.MinX, region.Bounds.MinY, region.Bounds.MaxX, region.Bounds.MaxY,
				region.ShapeCount, labelAttr))
		}
		sb.WriteString("  </OCCUPIED_REGIONS>\n")
	}

	// Avoid zones (simplified)
	sb.WriteString("  <AVOID_ZONES>\n")
	sb.WriteString("    Do NOT place new shapes inside the OCCUPIED_REGIONS bounds listed above.\n")
	sb.WriteString("  </AVOID_ZONES>\n")

	// Suggested placement
	if len(state.SuggestedAreas) > 0 {
		sb.WriteString("  <SUGGESTED_PLACEMENT>\n")
		for _, suggestion := range state.SuggestedAreas {
			sb.WriteString(fmt.Sprintf("    - %s\n", suggestion))
		}
		sb.WriteString("  </SUGGESTED_PLACEMENT>\n")
	}

	sb.WriteString("</CANVAS_STATE>")

	return sb.String()
}
