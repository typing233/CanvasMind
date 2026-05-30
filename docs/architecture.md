# CanvasMind Architecture

## Overview

CanvasMind is a plugin-based whiteboard engine. All functionality is delivered through plugins, making the core small and extensible.

```
┌─────────────────────────────────────────────────────────┐
│                        App Shell                         │
├──────────┬──────────────────────────────┬───────────────┤
│ Toolbar  │      Infinite Canvas         │  Side Panels  │
│          │   (Konva Stage + Layers)     │  (MD Editor)  │
├──────────┴──────────────────────────────┴───────────────┤
│                    Plugin System                          │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐  │
│  │MindMap  │ │Flowchart │ │Freehand│ │Sticky/Image/ │  │
│  │Plugin   │ │Plugin    │ │Plugin  │ │Shapes/Export │  │
│  └─────────┘ └──────────┘ └────────┘ └──────────────┘  │
├──────────────────────────────────────────────────────────┤
│                       Core Layer                         │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌───────────────┐  │
│  │Zustand │ │Command   │ │Event   │ │Viewport       │  │
│  │Store   │ │History   │ │Bus     │ │Manager        │  │
│  └────────┘ └──────────┘ └────────┘ └───────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Core Layer

### Data Model (`src/core/data-model/`)
- `types.ts`: All TypeScript interfaces (CanvasNode, CanvasEdge, NodeStyle, etc.)
- `store.ts`: Zustand store — single source of truth for the document

### Command History (`src/core/commands/`)
- Undo/redo stack with max 100 entries
- Every user mutation must create a Command
- `CompositeCommand` for batching

### Event Bus (`src/core/event-bus/`)
- Simple pub/sub for decoupled inter-component communication
- Used for: drag events, markdown sync, plugin lifecycle

### Plugin System (`src/core/plugin-system/`)
- `IPlugin` interface with required + optional lifecycle hooks
- `PluginManager` handles registration, activation (exclusive mode), enabling (multiple)
- Plugins can contribute: toolbar buttons, node types, edge types

## Canvas Layer

### Rendering (`src/canvas/`)
- Konva Stage with viewport transform (pan/zoom)
- `NodesLayer`: Renders all visible node shapes (memoized)
- `EdgesLayer`: Renders all visible edge connections
- Viewport culling: Only renders nodes within screen bounds + margin

### Culling (`src/canvas/culling/`)
- `ViewportCuller`: AABB visibility test
- `SpatialIndex`: Grid-based spatial index for fast queries

## Sync Engine (`src/sync/`)
- Bidirectional real-time sync between markdown and mind map
- Debounced (400ms markdown→canvas, immediate canvas→markdown)
- Cycle-breaking via `updating` flag
- Incremental diff to minimize node recreation

## i18n (`src/i18n/`)
- Custom lightweight solution (no external dep)
- React context with `useT()` hook
- JSON dictionaries: `en.ts`, `zh.ts`
- Locale persisted in localStorage
