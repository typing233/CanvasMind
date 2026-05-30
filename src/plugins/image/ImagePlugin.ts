import { IPlugin, PluginContext, PluginMetadata, ToolbarContribution } from '../../core/plugin-system/types';
import { CanvasNode, DEFAULT_NODE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { nanoid } from 'nanoid';
import { screenToCanvas } from '../../core/viewport/ViewportManager';

class AddImageNodeCommand implements ICommand {
  id = nanoid();
  description = 'Insert image';
  private node: CanvasNode;
  private ctx: PluginContext;

  constructor(ctx: PluginContext, src: string, position: { x: number; y: number }, size: { width: number; height: number }) {
    this.ctx = ctx;
    this.node = {
      id: nanoid(),
      type: 'image',
      position,
      size,
      data: { src },
      style: DEFAULT_NODE_STYLE,
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

export class ImagePlugin implements IPlugin {
  id = 'image';
  name = 'Image Insert';
  version = '1.0.0';
  metadata: PluginMetadata = {
    description: 'Insert images onto the canvas',
    author: 'CanvasMind',
    icon: '🖼️',
    category: 'tool',
  };

  private ctx!: PluginContext;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  contributeToolbar(): ToolbarContribution[] {
    return [{
      id: 'insert-image',
      label: '🖼️ Image',
      icon: '🖼️',
      group: 'tools',
      onClick: () => this.openFilePicker(),
    }];
  }

  private openFilePicker(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 300;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w *= ratio;
            h *= ratio;
          }
          const viewport = this.ctx.store.document.viewport;
          const pos = screenToCanvas({ x: 400, y: 300 }, viewport);
          const cmd = new AddImageNodeCommand(this.ctx, src, pos, { width: w, height: h });
          this.ctx.commandHistory.execute(cmd);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
}
