# Shape Annotation System

## Overview

The Shape Annotation System enables the LLM to visually identify shapes on the board by overlaying numbered badges (1, 2, 3...) on each shape in the image sent to the AI. Each shape in the response array includes a matching `number` field, allowing the LLM to correlate visual elements with their corresponding shape IDs.

## Problem Statement

When the LLM receives a board image and a shapes array with UUIDs, it cannot reliably determine which visual element corresponds to which shape ID. This makes it difficult for the LLM to use the `updateShape` tool correctly, as it cannot identify the correct `shapeId` to update.

## Solution

1. **Numbered Badges**: Draw numbered badges at each shape's center in the image
2. **Persistent Numbers**: Store annotation numbers in the database (not sequential)
3. **Caching**: Cache annotated images to avoid re-processing on every request

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GetBoardDataHandler                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Fetch shapes from DB (with annotation_number)               │
│  2. Get original board image                                     │
│  3. Call GetOrCreateAnnotatedImage()                            │
│     └─> Check cache validity (hash comparison)                  │
│         ├─> Cache valid: Return cached image                    │
│         └─> Cache invalid: Generate & cache new image           │
│  4. Return annotated image + shapes with numbers                │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
internal/
├── models/
│   ├── board.go           # Added: AnnotatedImageHash field
│   └── board_data.go      # Added: AnnotationNumber field
├── repo/
│   └── board_data.go      # Added: GetNextAnnotationNumber(), GetShapeByUUID()
└── melina/tools/
    ├── image_annotator.go       # Core annotation logic
    ├── annotated_image_cache.go # Caching mechanism
    └── tool_definitions.go      # Updated handlers

temp/
└── annotated_images/      # Cached annotated images
    └── {boardId}.png
```

---

## Database Schema Changes

### BoardData Table
```sql
ALTER TABLE board_data ADD COLUMN annotation_number INT NOT NULL DEFAULT 0;
```

| Field | Type | Description |
|-------|------|-------------|
| `annotation_number` | INT | Persistent number assigned when shape is created. Numbers are NOT sequential - deleting shape #3 does not renumber shape #4. |

### Boards Table
```sql
ALTER TABLE boards ADD COLUMN annotated_image_hash VARCHAR(64) DEFAULT '';
```

| Field | Type | Description |
|-------|------|-------------|
| `annotated_image_hash` | VARCHAR(64) | SHA-256 hash of shapes data. Used to validate cache. Empty string means cache is invalid. |

---

## Flow Diagrams

### 1. Shape Creation Flow

```
AddShapeHandler / Frontend Save
        │
        ▼
┌───────────────────────┐
│  SaveShapeData()      │
│  - Check if exists    │
│  - If new: assign     │
│    next annotation #  │
│  - If existing: keep  │
│    current number     │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ InvalidateCache()     │
│ - Clear hash in DB    │
└───────────────────────┘
```

### 2. GetBoardData Flow

```
GetBoardDataHandler(boardId)
        │
        ▼
┌───────────────────────┐
│ Fetch shapes from DB  │
│ (includes annotation  │
│  numbers)             │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Get original image    │
│ from temp/images/     │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ GetOrCreateAnnotated  │
│ Image()               │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Compute current hash  │
│ of shapes data        │
└───────────────────────┘
        │
        ▼
    ┌───────┐
    │ Hash  │
    │ Match?│
    └───┬───┘
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
   ▼         ▼
┌──────┐  ┌──────────────┐
│Return│  │AnnotateImage │
│Cached│  │WithNumbers() │
│Image │  └──────┬───────┘
└──────┘         │
                 ▼
          ┌──────────────┐
          │ Save to cache│
          │ Update hash  │
          └──────────────┘
                 │
                 ▼
          ┌──────────────┐
          │ Return new   │
          │ annotated    │
          │ image        │
          └──────────────┘
```

### 3. Cache Invalidation Flow

```
Shape Added/Updated/Deleted
        │
        ▼
┌───────────────────────────┐
│ InvalidateAnnotatedImage  │
│ Cache(boardId)            │
│                           │
│ - Set AnnotatedImageHash  │
│   to empty string in DB   │
└───────────────────────────┘
        │
        ▼
Next GetBoardData call will
regenerate the annotated image
```

---

## Key Components

### 1. AnnotationNumber Assignment

```go
// In board_data.go repository
func (r *BoardDataRepo) GetNextAnnotationNumber(boardId uuid.UUID) (int, error) {
    var maxNumber int
    err := r.db.Model(&models.BoardData{}).
        Where("board_id = ?", boardId).
        Select("COALESCE(MAX(annotation_number), 0)").
        Scan(&maxNumber).Error
    return maxNumber + 1, err
}
```

- Numbers are assigned incrementally: max + 1
- Numbers are permanent (never reassigned)
- Deleting a shape leaves a gap in numbers (this is intentional)

### 2. Center Point Calculation

| Shape Type | Center Calculation |
|------------|-------------------|
| `rect` | `(x + w/2, y + h/2)` |
| `circle` | `(x, y)` - already centered |
| `ellipse` | `(x + w/2, y + h/2)` |
| `line/arrow` | Midpoint of bounding box |
| `pencil` | Bounding box center of all points |
| `polygon` | Centroid of vertices |
| `text` | `(x + 50, y + fontSize/2)` |
| `image` | `(x + w/2, y + h/2)` |

### 3. Badge Styling

```go
BadgeConfig{
    Radius:          16,
    BackgroundColor: "#FF5722",  // Orange-red
    TextColor:       "#FFFFFF",  // White
    BorderColor:     "#FFFFFF",  // White border
    BorderWidth:     2,
    FontSize:        12,
}
```

- Multi-digit numbers get wider badges
- Badges are clamped to image bounds

### 4. Hash Computation

```go
func ComputeShapesHash(shapes []models.BoardData) string {
    // Includes: uuid, type, annotation_number, x, y, w, h, r, points
    // Sorted by annotation_number for consistency
    // SHA-256 hash of JSON serialization
}
```

Changes that invalidate cache:
- Shape added
- Shape deleted
- Shape position/size changed
- Any shape property affecting visual location

---

## API Response Format

### Before (without annotations)
```json
{
  "image": "base64...",
  "shapes": [
    {"id": "uuid-xxx", "type": "rect", "x": 100, "y": 50}
  ]
}
```

### After (with annotations)
```json
{
  "image": "base64... (with numbered badges overlaid)",
  "shapes": [
    {"number": 1, "id": "uuid-xxx", "type": "rect", "x": 100, "y": 50},
    {"number": 2, "id": "uuid-yyy", "type": "circle", "x": 300, "y": 150}
  ]
}
```

The LLM can now say: "I see shape #1 is a rectangle. Let me update it using shapeId: uuid-xxx"

---

## Performance Considerations

### Cache Hit Scenario
1. Hash comparison: O(n) where n = number of shapes
2. File read: ~1-5ms
3. **Total: ~5-10ms**

### Cache Miss Scenario
1. Hash computation: O(n)
2. Image decode: ~10-20ms
3. Badge drawing: O(n) * ~1ms per badge
4. Image encode: ~10-20ms
5. File write: ~5-10ms
6. DB update: ~5-10ms
7. **Total: ~50-100ms** (for typical boards)

### Memory Usage
- Annotated images stored on disk, not in memory
- Only current request's image loaded at a time

---

## Edge Cases Handled

1. **Shapes at image edges**: Badge positions clamped within bounds
2. **Many shapes (10+)**: Dynamic badge sizing for multi-digit numbers
3. **Missing image file**: Returns error
4. **Invalid shape data**: Shape skipped, others still annotated
5. **Concurrent requests**: File-based cache is thread-safe for reads
6. **Cache file deleted**: Regenerated on next request

---

## Testing

Run the test suite:
```bash
cd internal/melina/tools
go test -v
```

Tests cover:
- Center calculation for all shape types
- Image annotation with multiple shapes
- Edge case handling
- Empty shapes array
- Invalid shape data

---

## Migration Guide

### For Existing Databases

1. Run the migration:
```sql
ALTER TABLE board_data ADD COLUMN annotation_number INT NOT NULL DEFAULT 0;
ALTER TABLE boards ADD COLUMN annotated_image_hash VARCHAR(64) DEFAULT '';
```

2. Assign annotation numbers to existing shapes:
```sql
WITH numbered AS (
  SELECT uuid, ROW_NUMBER() OVER (PARTITION BY board_id ORDER BY created_at) as num
  FROM board_data
)
UPDATE board_data
SET annotation_number = numbered.num
FROM numbered
WHERE board_data.uuid = numbered.uuid;
```

### For GORM AutoMigrate

Just restart the server - GORM will add the new columns automatically.

---

## Troubleshooting

### Annotated image not showing badges
- Check if shapes have `annotation_number > 0` in database
- Verify font file exists at `assets/fonts/Roboto-Bold.ttf`

### Cache not invalidating
- Check `annotated_image_hash` in boards table
- Should be empty string after shape changes

### Numbers not sequential
- This is by design - numbers are permanent
- Gaps appear when shapes are deleted
