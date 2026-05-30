import { IPlugin, PluginContext, PluginMetadata, ToolbarContribution } from '../../core/plugin-system/types';
import { CanvasNode, DEFAULT_NODE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { nanoid } from 'nanoid';
import { screenToCanvas } from '../../core/viewport/ViewportManager';

const COLORS = ['#FEF3C7', '#FECACA', '#BBF7D0', '#BFDBFE', '#E9D5FF'];

class AddStickyNoteCommand implements ICommand {
  id = nanoid();
  description = 'Add sticky note';
  private node: CanvasNode;
  private ctx: PluginContext;

  constructor(ctx: PluginContext, color: string, position: { x: number; y: number }) {
    this.ctx = ctx;
    this.node = {
      id: nanoid(),
      type: 'sticky-note',
      position,
      size: { width: 160, height: 160 },
      data: { text: '', color, rotation: (Math.random() - 0.5) * 4 },
      style: { ...DEFAULT_NODE_STYLE, fontSize: 13 },
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

export class StickyNotePlugin implements IPlugin {
  id = 'sticky-note';
  name = 'Sticky Notes';
  version = '1.0.0';
  metadata: PluginMetadata = {
    description: 'Add colorful sticky notes to the canvas',
    author: 'CanvasMind',
    icon: '📝',
    category: 'tool',
  };

  private ctx!: PluginContext;
  private colorIndex = 0;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  contributeToolbar(): ToolbarContribution[] {
    return [{
      id: 'add-sticky',
      label: '📝 Sticky',
      icon: '📝',
      group: 'tools',
      onClick: () => this.addNote(),
    }];
  }

  addNote(): void {
    const viewport = this.ctx.store.document.viewport;
    const pos = screenToCanvas({ x: 400, y: 300 }, viewport);
    const color = COLORS[this.colorIndex % COLORS.length];
    this.colorIndex++;
    const cmd = new AddStickyNoteCommand(this.ctx, color, pos);
    this.ctx.commandHistory.execute(cmd);
  }
}
