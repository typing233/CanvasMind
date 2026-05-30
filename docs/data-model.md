# Data Model Specification

## Document Structure

```typescript
interface CanvasDocument {
  id: string;            // Unique document ID (nanoid)
  name: string;          // Document title
  nodes: Record<NodeId, CanvasNode>;
  edges: Record<EdgeId, CanvasEdge>;
  viewport: { x: number; y: number; zoom: number };
}
```

## Node Types

| Type | Description | Data Fields |
|------|-------------|-------------|
| `mindmap` | Mind map node | `text`, `markdownLineStart?`, `markdownLineEnd?` |
| `flowchart-rect` | Rectangle node | `text` |
| `flowchart-diamond` | Diamond/decision node | `text` |
| `freehand-path` | Freehand drawing | `points: number[]`, `color`, `strokeWidth` |
| `sticky-note` | Sticky note | `text`, `color`, `rotation` |
| `image` | Image node | `src` (base64 data URL) |
| `shape-*` | Geometry shapes | `shape` (circle/triangle/hexagon/star/arrow-shape) |

## Edge Types

| Type | Description |
|------|-------------|
| `mindmap-branch` | Hierarchical mind map connection |
| `flowchart-arrow` | Flowchart arrow with waypoints |
| `connector` | Generic connector (curved/straight/stepped) |

## Node Style

```typescript
interface NodeStyle {
  fill: string;         // Background color
  stroke: string;       // Border color
  strokeWidth: number;  // Border width
  fontSize: number;     // Text size
  fontColor: string;    // Text color
  borderRadius: number; // Corner radius
}
```

## Edge Style

```typescript
interface EdgeStyle {
  stroke: string;       // Line color
  strokeWidth: number;  // Line width
  dash?: number[];      // Dash pattern (e.g., [8, 4])
  arrowStart: boolean;  // Arrow at start
  arrowEnd: boolean;    // Arrow at end
}
```

## Persistence

Documents are auto-saved to `localStorage` under key `canvasmind-document`. The store subscribes to all state changes and serializes the full document as JSON.

## Extensibility

The `type` field on both nodes and edges accepts any string, allowing plugins to register custom types. Plugin-specific data goes in the `data` field (Record<string, unknown>).
