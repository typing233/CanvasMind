# Plugin Development Guide

## Overview

CanvasMind plugins extend the whiteboard with new node types, toolbar actions, and behaviors. Every drawing mode (mind map, flowchart, freehand) is itself a plugin.

## Creating a Plugin

Create a file at `src/plugins/your-plugin/YourPlugin.ts`:

```typescript
import { IPlugin, PluginContext, PluginMetadata, ToolbarContribution } from '../../core/plugin-system/types';

export class MyPlugin implements IPlugin {
  id = 'my-plugin';
  name = 'My Plugin';
  version = '1.0.0';
  
  metadata: PluginMetadata = {
    description: 'What your plugin does',
    author: 'Your Name',
    icon: '🔧',
    category: 'tool', // 'core' | 'shape' | 'tool' | 'export' | 'integration'
  };

  private ctx!: PluginContext;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
    // One-time setup: subscribe to events, etc.
  }

  activate(): void {
    // Called when this plugin becomes the active mode
  }

  deactivate(): void {
    // Called when another plugin becomes active
  }

  destroy(): void {
    // Cleanup
  }

  // Optional: add buttons to the toolbar
  contributeToolbar(): ToolbarContribution[] {
    return [{
      id: 'my-action',
      label: '🔧 Do Thing',
      onClick: () => this.doSomething(),
    }];
  }

  private doSomething(): void {
    // Access store, command history, event bus via this.ctx
  }
}
```

## Registering Your Plugin

In `src/App.tsx`:

```typescript
import { MyPlugin } from './plugins/my-plugin/MyPlugin';

// Inside App component:
const myPlugin = useMemo(() => new MyPlugin(), []);

// In pluginManager setup:
pm.register(myPlugin);
```

## Plugin Context

Every plugin receives a `PluginContext` with:

- `store`: Zustand store for reading/writing nodes and edges
- `eventBus`: Pub/sub for emitting and listening to events
- `commandHistory`: Execute commands for undoable operations

## Making Operations Undoable

All user-visible mutations must use the Command pattern:

```typescript
import { ICommand } from '../../core/commands/Command';
import { nanoid } from 'nanoid';

class MyCommand implements ICommand {
  id = nanoid();
  description = 'My operation';

  execute(): void {
    // Do the thing
  }

  undo(): void {
    // Reverse the thing
  }
}

// In your plugin:
this.ctx.commandHistory.execute(new MyCommand());
```

## Adding Custom Node Types

1. Define your node creation logic in the plugin
2. Add rendering in `src/canvas/layers/NodesLayer.tsx`
3. Nodes are stored as `CanvasNode` with a custom `type` string and `data` payload

## Events

Common events you can listen to or emit:

- `plugin:activated` / `plugin:deactivated`
- `mindmap:node-moved` / `flowchart:node-moved`
- `freehand:start` / `freehand:end`
- `markdown:node-located`

## Tips

- Use `screenToCanvas()` from ViewportManager to convert screen coordinates to canvas coordinates
- Store plugin-specific data in `node.data` (Record<string, unknown>)
- Always handle undo — users expect it
- Add i18n keys in `src/i18n/en.ts` and `src/i18n/zh.ts` for your UI text
