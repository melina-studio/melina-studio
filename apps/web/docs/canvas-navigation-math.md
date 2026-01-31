# Canvas Navigation Math

This document explains the mathematics behind the `navigateTo` helper function that smoothly pans and zooms the canvas to show specific coordinates.

## Coordinate Systems

### 1. Screen/Viewport Coordinates
- Origin `(0, 0)` is at the **top-left** of the browser window
- X increases to the right
- Y increases downward
- Units: pixels

```
(0,0) ────────────────────► X
  │
  │    ┌─────────────────┐
  │    │                 │
  │    │    Viewport     │
  │    │                 │
  │    └─────────────────┘
  ▼
  Y
```

### 2. Canvas/Stage Coordinates
- The infinite drawing surface where shapes live
- A shape at `(500, 300)` means 500 pixels right, 300 pixels down from the canvas origin
- The canvas can be panned and zoomed

### 3. The Relationship
The stage has two key properties:
- **`stage.position()`** → `{ x, y }` - How much the canvas is offset
- **`stage.scale()`** → `{ x, y }` - The zoom level (typically same for x and y)

**Formula to convert canvas point to screen point:**
```
screenX = (canvasX * scale) + stage.x
screenY = (canvasY * scale) + stage.y
```

**Inverse (screen to canvas):**
```
canvasX = (screenX - stage.x) / scale
canvasY = (screenY - stage.y) / scale
```

---

## The Centering Problem

**Goal:** Given a canvas point `(targetX, targetY)`, find the stage position that places this point at the center of the viewport.

### Visual Representation

```
┌───────────────────────────────────────┐
│            Viewport                   │
│                                       │
│              center                   │
│                ●                      │
│           (vw/2, vh/2)               │
│                                       │
│                                       │
└───────────────────────────────────────┘

We want the target point on the canvas to appear at the viewport center.
```

### Derivation

We want:
```
screenX of target = viewport center X
```

Using our conversion formula:
```
(targetX * scale) + stage.x = viewportWidth / 2
```

Solving for `stage.x`:
```
stage.x = (viewportWidth / 2) - (targetX * scale)
```

Same for Y:
```
stage.y = (viewportHeight / 2) - (targetY * scale)
```

### In Code

```typescript
const targetPosition = {
  x: dimensions.width / 2 - x * targetScale,
  y: dimensions.height / 2 - y * targetScale,
};
```

---

## The Auto-Zoom Problem

**Goal:** Given a bounding box of shapes, find the zoom level that fits the entire box within the viewport (with padding).

### Visual Representation

```
┌─────────────────────────────────────────────┐
│  padding                                    │
│    ┌─────────────────────────────────┐      │
│    │                                 │      │
│    │     Shapes Bounding Box         │      │
│    │     (width × height)            │      │
│    │                                 │      │
│    └─────────────────────────────────┘      │
│                                     padding │
└─────────────────────────────────────────────┘
         Available viewport space
```

### Derivation

Available space after padding:
```
availableWidth  = viewportWidth  - (padding * 2)
availableHeight = viewportHeight - (padding * 2)
```

To fit the bounding box width:
```
boundingBoxWidth * scale = availableWidth
scale = availableWidth / boundingBoxWidth
```

To fit the bounding box height:
```
boundingBoxHeight * scale = availableHeight
scale = availableHeight / boundingBoxHeight
```

We need BOTH to fit, so we take the **minimum**:
```
scale = min(
  availableWidth / boundingBoxWidth,
  availableHeight / boundingBoxHeight
)
```

Then clamp to allowed range:
```
scale = clamp(scale, MIN_SCALE, MAX_SCALE)
```

### In Code

```typescript
if (autoZoom && width && height && width > 0 && height > 0) {
  const viewportWidth = dimensions.width - padding * 2;
  const viewportHeight = dimensions.height - padding * 2;

  const scaleX = viewportWidth / width;
  const scaleY = viewportHeight / height;

  targetScale = clamp(
    Math.min(scaleX, scaleY),
    STAGE_MIN_SCALE,  // 0.1 (10%)
    STAGE_MAX_SCALE   // 1.0 (100%)
  );
}
```

---

## Bounding Box Calculation

### For Simple Shapes

**Rectangle:**
```
minX = shape.x
minY = shape.y
maxX = shape.x + shape.width
maxY = shape.y + shape.height
```

**Circle:**
```
minX = shape.x - radius
minY = shape.y - radius
maxX = shape.x + radius
maxY = shape.y + radius
```

**Ellipse:**
```
minX = shape.x - radiusX
minY = shape.y - radiusY
maxX = shape.x + radiusX
maxY = shape.y + radiusY
```

### For Point-Based Shapes (Pencil, Line, Arrow)

Iterate through all points and track extremes:
```
minX = min(all x coordinates)
minY = min(all y coordinates)
maxX = max(all x coordinates)
maxY = max(all y coordinates)
```

### Merging Multiple Bounds

To find a bounding box that contains multiple shapes:
```
combined.minX = min(all shapes' minX)
combined.minY = min(all shapes' minY)
combined.maxX = max(all shapes' maxX)
combined.maxY = max(all shapes' maxY)
```

### Finding Center from Bounds

```
centerX = (minX + maxX) / 2
centerY = (minY + maxY) / 2
width   = maxX - minX
height  = maxY - minY
```

---

## Complete Example

**Scenario:** LLM adds 3 shapes:
1. Rectangle at (1000, 800), size 200x150
2. Circle at (1200, 900), radius 50
3. Text at (1050, 1000), estimated size 100x20

**Step 1: Calculate individual bounds**

```
Rect:   { minX: 1000, minY: 800,  maxX: 1200, maxY: 950  }
Circle: { minX: 1150, minY: 850,  maxX: 1250, maxY: 950  }
Text:   { minX: 1050, minY: 1000, maxX: 1150, maxY: 1020 }
```

**Step 2: Merge bounds**

```
combined = {
  minX: min(1000, 1150, 1050) = 1000,
  minY: min(800, 850, 1000)   = 800,
  maxX: max(1200, 1250, 1150) = 1250,
  maxY: max(950, 950, 1020)   = 1020
}
```

**Step 3: Calculate center and dimensions**

```
centerX = (1000 + 1250) / 2 = 1125
centerY = (800 + 1020) / 2  = 910
width   = 1250 - 1000       = 250
height  = 1020 - 800        = 220
```

**Step 4: Calculate zoom (assuming 1400x900 viewport, 100px padding)**

```
availableWidth  = 1400 - 200 = 1200
availableHeight = 900 - 200  = 700

scaleX = 1200 / 250 = 4.8
scaleY = 700 / 220  = 3.18

targetScale = min(4.8, 3.18) = 3.18
targetScale = clamp(3.18, 0.1, 1.0) = 1.0  // Clamped to max
```

**Step 5: Calculate stage position**

```
stage.x = 1400/2 - 1125 * 1.0 = 700 - 1125 = -425
stage.y = 900/2 - 910 * 1.0   = 450 - 910  = -460
```

**Result:** Stage moves to `(-425, -460)` at scale `1.0`, centering all shapes in view.

---

## Debouncing Multiple Shapes

When LLM adds shapes rapidly, we batch them:

```
Timeline:
─────────────────────────────────────────────────►
   │         │         │                   │
Shape 1   Shape 2   Shape 3            Navigate
   │         │         │                   │
   └─────────┴─────────┴───── 500ms ──────┘
         (timer resets each time)
```

This ensures:
- Only ONE navigation happens
- All shapes are included in the bounding box
- User sees smooth, single animation to final position
