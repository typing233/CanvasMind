# Contributing to CanvasMind

We're glad you're interested in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/your-org/canvasmind.git
cd canvasmind

# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

```
src/
├── core/               # Framework: data model, commands, event bus, plugins, viewport
├── canvas/             # Konva-based rendering: infinite canvas, node/edge layers, culling
├── plugins/            # Built-in plugins (mind-map, flowchart, freehand, shapes, etc.)
├── panels/             # Side panels: markdown editor, style editor
├── sync/               # Bidirectional markdown ↔ mind map sync engine
├── ui/                 # Toolbar, plugin marketplace
└── i18n/               # Internationalization (en/zh)
```

## Architecture

- **Plugin-based**: All drawing modes are plugins implementing `IPlugin`. See `docs/plugin-development.md`.
- **Command pattern**: All mutations go through `CommandHistory` for undo/redo.
- **Event bus**: Decoupled communication between components.
- **Zustand store**: Single source of truth for all canvas data.

## Coding Standards

- TypeScript strict mode
- No comments unless explaining a non-obvious "why"
- All user-facing mutations must be undoable (use Command pattern)
- All UI text must go through `useT()` hook for i18n
- Use `React.memo` for canvas shape components

## Pull Request Process

1. Fork the repo and create a feature branch from `main`
2. Make your changes with clear commit messages
3. Ensure `npm run build` passes
4. Test your changes manually in the browser
5. Submit a PR with a clear description of what and why

## Adding a Plugin

See `docs/plugin-development.md` for the full guide. In brief:

1. Create `src/plugins/your-plugin/YourPlugin.ts` implementing `IPlugin`
2. Add `metadata` for the marketplace
3. Implement `contributeToolbar()` for toolbar buttons
4. Register in `App.tsx`

## Reporting Issues

Use GitHub Issues. Please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS info
