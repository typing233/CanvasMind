import { IPlugin, PluginContext, PluginMetadata, ToolbarContribution } from '../../core/plugin-system/types';
import { CanvasNode, DEFAULT_NODE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { nanoid } from 'nanoid';
import { screenToCanvas } from '../../core/viewport/ViewportManager';

const SHAPES = ['circle', 'triangle', 'hexagon', 'star', 'arrow-shape'] as const;

class AddShapeCommand implements ICommand {
  id = nanoid();
  description: string;
  private node: CanvasNode;
  private ctx: PluginContext;

  constructor(ctx: PluginContext, shape: string, position: { x: number; y: number }) {
    this.ctx = ctx;
    this.description = `Add ${shape} shape`;
    this.node = {
      id: nanoid(),
      type: `shape-${shape}`,
      position,
      size: { width: 100, height: 100 },
      data: { shape },
      style: { ...DEFAULT_NODE_STYLE, fill: '#DBEAFE', stroke: '#2563EB' },
      locked: false,
    };
  }

  execute(): void {
    this.ctx.store.addNode(this.node);
  }

  undo(): void {
    this.ctx.store.removeNode(this.node.id);
  }
}

export class ShapesPlugin implements IPlugin {
  id = 'shapes';
  name = 'Geometry Shapes';
  version = '1.0.0';
  metadata: PluginMetadata = {
    description: 'Library of geometric shapes: circle, triangle, star, hexagon, arrow',
    author: 'CanvasMind',
    icon: '⬡',
    category: 'shape',
  };

  private ctx!: PluginContext;
  private currentShape: string = 'circle';

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  contributeToolbar(): ToolbarContribution[] {
    return SHAPES.map(shape => ({
      id: `add-shape-${shape}`,
      label: this.getShapeIcon(shape) + ' ' + shape,
      icon: this.getShapeIcon(shape),
      group: 'shapes',
      onClick: () => this.addShape(shape),
    }));
  }

  private getShapeIcon(shape: string): string {
    switch (shape) {
      case 'circle': return '⬤';
      case 'triangle': return '▲';
      case 'hexagon': return '⬡';
      case 'star': return '★';
      case 'arrow-shape': return '➤';
      default: return '■';
    }
  }

  addShape(shape: string = this.currentShape): void {
    this.currentShape = shape;
    const viewport = this.ctx.store.document.viewport;
    const pos = screenToCanvas({ x: 400, y: 300 }, viewport);
    const cmd = new AddShapeCommand(this.ctx, shape, pos);
    this.ctx.commandHistory.execute(cmd);
  }
}
