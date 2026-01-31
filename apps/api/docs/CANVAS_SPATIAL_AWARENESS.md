# Canvas Spatial Awareness

This document explains how the Canvas Spatial Awareness system works to prevent the LLM from placing new shapes over existing content.

## Problem Statement

When users send follow-up messages like "continue" or "add more details", the LLM doesn't inherently know:
1. What shapes already exist on the board
2. Where those shapes are located
3. Which areas are occupied (and should be avoided)

**Result:** New shapes overlap with existing content.

**Example:** User creates a "Shallow Copy vs Deep Copy" diagram, then says "continue". The LLM draws the Deep Copy section directly over the existing Shallow Copy section.

---

## Solution: Auto-Injected Canvas State

Instead of relying on the LLM to call `getBoardData` (which adds latency and tokens), we automatically inject a **Canvas State Summary** with every message. This gives the LLM spatial awareness without extra tool calls.

```
┌─────────────────────────────────────────────────────────────┐
│                      User Message                           │
│                    "add more details"                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Workflow (Go Backend)                    │
│                                                             │
│  1. Fetch shapes from database                              │
│  2. Generate canvas state (clustering + bounds)             │
│  3. Format as XML                                           │
│  4. Prepend to user message                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Message to LLM                          │
│                                                             │
│  <CANVAS_STATE>                                             │
│    <SUMMARY>Board has 22 shapes across 2 regions</SUMMARY>  │
│    <OCCUPIED_REGIONS>                                       │
│      <REGION bounds="(50,80)-(500,600)" label="SHALLOW..."/> │
│    </OCCUPIED_REGIONS>                                      │
│    <SUGGESTED_PLACEMENT>                                    │
│      - Below existing content: y > 650                      │
│    </SUGGESTED_PLACEMENT>                                   │
│  </CANVAS_STATE>                                            │
│                                                             │
│  add more details                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Files Involved

| File | Purpose |
|------|---------|
| `apps/api/internal/melina/tools/canvas_state.go` | Core spatial logic |
| `apps/api/internal/melina/workflow/workflow.go` | Integration point |
| `apps/api/internal/melina/agents/agent.go` | Prepends to message |
| `apps/api/internal/melina/prompts/master_prompt.go` | LLM instructions |

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Database   │────▶│  Workflow    │────▶│    Agent     │
│  (shapes)    │     │  (generate)  │     │  (prepend)   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ canvas_state │
                     │     .go      │
                     └──────────────┘
                            │
                     ┌──────┴──────┐
                     ▼             ▼
              ┌──────────┐  ┌──────────┐
              │ Bounding │  │ Cluster  │
              │   Box    │  │  Shapes  │
              │  Calc    │  │          │
              └──────────┘  └──────────┘
```

---

## Core Components

### 1. Bounding Box Calculation

Each shape type has different geometry, so we calculate bounds differently:

```go
// canvas_state.go - GetShapeBounds()

func GetShapeBounds(shapeData models.BoardData, padding float64) (BoundingBox, error)
```

#### Shape-Specific Calculations

**Rectangle / Frame:**
```
minX = x
minY = y
maxX = x + width
maxY = y + height
```

**Circle:**
```
minX = x - radius
minY = y - radius
maxX = x + radius
maxY = y + radius
```

**Ellipse:**
```
minX = x - radiusX
minY = y - radiusY
maxX = x + radiusX
maxY = y + radiusY
```

**Line / Arrow / Pencil (point-based):**
```
for each point (px, py):
    minX = min(minX, px + offsetX)
    minY = min(minY, py + offsetY)
    maxX = max(maxX, px + offsetX)
    maxY = max(maxY, py + offsetY)
```

**Text:**
```
estimatedWidth = maxLineLength * fontSize * 0.6
estimatedHeight = lineCount * fontSize * 1.4

minX = x
minY = y
maxX = x + estimatedWidth
maxY = y + estimatedHeight
```

---

### 2. Shape Clustering Algorithm

Shapes that are close together are grouped into "regions". This prevents reporting 50 individual shapes when they form a single logical diagram.

```go
// canvas_state.go - clusterShapes()

func clusterShapes(shapes []shapeWithBounds, maxGap float64) [][]shapeWithBounds
```

#### Algorithm: Proximity-Based Clustering

```
Parameters:
- maxGap = 100px (shapes within 100px are considered "nearby")

Algorithm:
1. Start with first unassigned shape as a new cluster
2. Calculate cluster's bounding box
3. For each unassigned shape:
   - If shape overlaps or is within maxGap of cluster bounds:
     - Add shape to cluster
     - Expand cluster bounds
     - Mark as changed
4. Repeat step 3 until no changes
5. If unassigned shapes remain, go to step 1
```

#### Visual Example

```
Before clustering (5 shapes):

    ┌───┐         ┌───┐
    │ A │         │ D │
    └───┘         └───┘
      │             │
    ┌───┐         ┌───┐
    │ B │         │ E │
    └───┘         └───┘
    ┌───┐
    │ C │
    └───┘

After clustering (2 regions):

┌─────────────┐   ┌─────────────┐
│  Region 1   │   │  Region 2   │
│  (A, B, C)  │   │   (D, E)    │
│             │   │             │
└─────────────┘   └─────────────┘
```

#### Bounds Overlap Check

Two bounding boxes overlap (or are within maxGap) if:

```go
func boundsOverlap(a, b BoundingBox, maxGap float64) bool {
    return !(a.MaxX+maxGap < b.MinX ||
             b.MaxX+maxGap < a.MinX ||
             a.MaxY+maxGap < b.MinY ||
             b.MaxY+maxGap < a.MinY)
}
```

---

### 3. Semantic Label Detection

Each region can have a label extracted from text shapes within it.

```go
// canvas_state.go - detectRegionLabel()

func detectRegionLabel(shapes []shapeWithBounds) string
```

#### Label Selection Priority

1. **ALL-CAPS text** (e.g., "SHALLOW COPY") - highest priority
2. **Topmost text** (lowest Y value) - if no ALL-CAPS found
3. **Short text < 50 chars** - to avoid using paragraph content as labels

#### Example

```
Region contains:
- Text "📋 SHALLOW COPY" at y=80    ← Selected (ALL-CAPS + topmost)
- Text "Original Object" at y=150
- Text "value: 42" at y=180

Detected label: "📋 SHALLOW COPY"
```

---

### 4. XML Formatting

The canvas state is formatted as XML for the LLM to parse.

```go
// canvas_state.go - FormatCanvasStateXML()

func FormatCanvasStateXML(state *CanvasState) string
```

#### Output Format

```xml
<CANVAS_STATE>
  <SUMMARY>Board has 22 shapes across 2 regions</SUMMARY>
  <OCCUPIED_REGIONS>
    <REGION id="1" bounds="(50,80)-(500,600)" shapes="12" label="SHALLOW COPY"/>
    <REGION id="2" bounds="(550,80)-(950,600)" shapes="10" label="DEEP COPY"/>
  </OCCUPIED_REGIONS>
  <AVOID_ZONES>
    Do NOT place new shapes inside the OCCUPIED_REGIONS bounds listed above.
  </AVOID_ZONES>
  <SUGGESTED_PLACEMENT>
    - Below existing content: y > 650
    - Right of existing content: x > 1000
    - Left side: x < 30
  </SUGGESTED_PLACEMENT>
</CANVAS_STATE>
```

#### Suggested Placement Logic

```go
// Always suggest below and right of existing content
suggestions = append(suggestions,
    fmt.Sprintf("Below existing content: y > %.0f", overallBounds.MaxY + padding))
suggestions = append(suggestions,
    fmt.Sprintf("Right of existing content: x > %.0f", overallBounds.MaxX + padding))

// Only suggest left if there's room (content doesn't start at edge)
if overallBounds.MinX > 100 {
    suggestions = append(suggestions,
        fmt.Sprintf("Left side: x < %.0f", overallBounds.MinX - padding))
}
```

---

## Integration Points

### 1. Workflow Integration

```go
// workflow.go - ProcessChatMessage()

// Generate canvas state for spatial awareness
var canvasStateXML string
shapes, err := w.boardDataRepo.GetBoardData(boardIdUUID)
if err != nil {
    log.Printf("Warning: Failed to get board data for canvas state: %v", err)
    // Continue without canvas state - it's not critical
} else if len(shapes) > 0 {
    // Generate canvas state with 50px padding and 100px cluster gap
    canvasState := tools.GenerateCanvasState(shapes, 50.0, 100.0)
    if canvasState != nil {
        canvasStateXML = tools.FormatCanvasStateXML(canvasState)
    }
}

// Pass to agent
responseWithUsage, err := agent.ProcessRequestStreamWithUsage(
    // ... other params ...
    canvasStateXML,  // Canvas state passed here
)
```

### 2. Agent Integration

```go
// agent.go - ProcessRequestStreamWithUsage()

// Prepend canvas state to user message if available
effectiveMessage := message
if canvasStateXML != "" {
    effectiveMessage = canvasStateXML + "\n\n" + message
}
```

### 3. Master Prompt Instructions

```xml
<!-- master_prompt.go -->

<SPATIAL_AWARENESS>
  Before adding NEW shapes, ALWAYS check <CANVAS_STATE> in the context.

  <RULES>
    - NEVER place new shapes inside OCCUPIED_REGIONS bounds
    - Use SUGGESTED_PLACEMENT areas for new content
    - Maintain at least 50px gap from existing shapes
    - When continuing a diagram, place new content BELOW or BESIDE existing
  </RULES>

  <CONTINUATION_PATTERN>
    When user says "continue", "add more", or similar:
    1. Check CANVAS_STATE for occupied regions
    2. Calculate position for new content (below or beside existing)
    3. Start new content at least 80px from existing shapes
  </CONTINUATION_PATTERN>
</SPATIAL_AWARENESS>
```

---

## Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `padding` | 50px | Added to region bounds as buffer zone |
| `clusterGap` | 100px | Max distance to consider shapes "nearby" |
| `minLabelLength` | 3 chars | Minimum text length to consider as label |
| `maxLabelLength` | 50 chars | Maximum text length to consider as label |

---

## Performance Considerations

### Token Usage

- **Canvas state XML:** ~300-500 characters (~100-150 tokens)
- **vs getBoardData:** ~5000-20000 characters (includes image + full shape data)

**Savings:** 90%+ token reduction compared to calling getBoardData

### Computation Time

- **Bounding box calculation:** O(n) where n = number of shapes
- **Clustering:** O(n²) worst case, but typically much faster
- **Overall:** < 10ms for typical boards (< 100 shapes)

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty board | No canvas state generated |
| Single shape | One region with that shape |
| Scattered shapes | Multiple small regions |
| Dense diagram | Few large regions |
| Very large board (1000+ shapes) | May need optimization |

---

## Debugging

### Enable Debug Logging

In `workflow.go`, add this line to see the full XML:

```go
log.Printf("Canvas state XML:\n%s", canvasStateXML)
```

### Expected Log Output

```
Generated canvas state: 22 shapes, 2 regions
Canvas state XML:
<CANVAS_STATE>
  <SUMMARY>Board has 22 shapes across 2 regions</SUMMARY>
  ...
</CANVAS_STATE>
Prepended canvas state to message (450 chars)
```

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| No canvas state in logs | Empty board or DB error | Check `GetBoardData` query |
| Wrong region bounds | Shape type not handled | Add case to `GetShapeBounds` |
| Too many regions | `clusterGap` too small | Increase to 150-200px |
| Too few regions | `clusterGap` too large | Decrease to 50-75px |
| Labels not detected | Text not ALL-CAPS | Check `detectRegionLabel` logic |

---

## Future Improvements

1. **Smarter placement suggestions** - Suggest specific coordinates, not just directions
2. **Grid-based regions** - Divide canvas into grid cells for faster lookup
3. **Semantic grouping** - Use frame boundaries to define regions
4. **Caching** - Cache canvas state until shapes change
5. **Incremental updates** - Only recalculate affected regions on shape changes
