# CanvasMind

A plugin-based whiteboard engine for mind maps, flowcharts, and free-form drawing. Built with React, TypeScript, and Konva.

## Features

- **Mind Map** — Hierarchical tree layout with auto-arrangement, drag reorder, child nodes
- **Flowchart** — Rectangles, diamonds, orthogonal arrow routing, node connections
- **Freehand Drawing** — Smooth strokes with path simplification
- **Sticky Notes** — Color-coded notes with slight rotation for visual variety
- **Geometry Shapes** — Circle, triangle, hexagon, star, arrow
- **Image Insertion** — Drag-and-drop images onto the canvas
- **Connectors** — Curved, straight, or stepped lines between any nodes
- **Export** — PNG and SVG export of the full canvas
- **Style Editor** — Color, stroke, font size, border radius for all elements
- **Real-time Markdown Sync** — Bidirectional live sync between markdown and mind map
- **Plugin Marketplace** — Enable/disable plugins, extensible architecture
- **i18n** — English and Chinese built-in
- **Infinite Canvas** — Pan, zoom, viewport culling for performance
- **Undo/Redo** — Full command history for all operations
- **Auto-save** — Persists to localStorage automatically

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
npm run preview
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

## Architecture

```
src/
├── core/           # Data model, commands, event bus, plugin system, viewport
├── canvas/         # Konva rendering, viewport culling, node/edge layers
├── plugins/        # 8 built-in plugins (mind-map, flowchart, freehand, sticky-note, image, connectors, shapes, export)
├── panels/         # Markdown editor panel, style editor panel
├── sync/           # Real-time bidirectional markdown ↔ mind map sync
├── ui/             # Toolbar, plugin marketplace
└── i18n/           # Internationalization
```

See [docs/architecture.md](docs/architecture.md) for detailed design.

## Plugin System

CanvasMind is fully extensible through plugins. Each plugin can:
- Add toolbar buttons
- Register new node/edge types
- React to canvas events
- Provide undo/redo support

See [docs/plugin-development.md](docs/plugin-development.md) for the guide.

## Tech Stack

- **React 19** + TypeScript
- **Konva** / react-konva for 2D canvas
- **Zustand** for state management
- **CodeMirror 6** for markdown editing
- **Tailwind CSS** for styling
- **Vite** for build tooling

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
