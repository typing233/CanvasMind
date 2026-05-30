import { IPlugin, PluginContext, PluginMetadata, ToolbarContribution } from '../../core/plugin-system/types';
import { CanvasEdge, DEFAULT_EDGE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { nanoid } from 'nanoid';

class AddConnectorCommand implements ICommand {
  id = nanoid();
  description = 'Add connector';
  private edge: CanvasEdge;
  private ctx: PluginContext;

  constructor(ctx: PluginContext, sourceId: string, targetId: string, style: 'curved' | 'straight' | 'stepped') {
    this.ctx = ctx;
    this.edge = {
      id: nanoid(),
      type: 'connector' as any,
      sourceId,
      targetId,
      style: { ...DEFAULT_EDGE_STYLE },
      data: { connectorStyle: style },
    } as any;
  }

  execute(): void {
    this.ctx.store.addEdge(this.edge);
  }

  undo(): void {
    this.ctx.store.removeEdge(this.edge.id);
  }
}

export class ConnectorPlugin implements IPlugin {
  id = 'connectors';
  name = 'Connectors';
  version = '1.0.0';
  metadata: PluginMetadata = {
    description: 'Draw connectors between any nodes',
    author: 'CanvasMind',
    icon: '🔗',
    category: 'tool',
  };

  private ctx!: PluginContext;
  private connectorStyle: 'curved' | 'straight' | 'stepped' = 'curved';

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  contributeToolbar(): ToolbarContribution[] {
    return [{
      id: 'add-connector',
      label: '🔗 Connect',
      icon: '🔗',
      group: 'tools',
      onClick: () => this.connectSelected(),
    }];
  }

  setStyle(style: 'curved' | 'straight' | 'stepped'): void {
    this.connectorStyle = style;
  }

  connectSelected(): void {
    const selected = this.ctx.store.selectedNodeIds;
    if (selected.length >= 2) {
      const cmd = new AddConnectorCommand(this.ctx, selected[0], selected[1], this.connectorStyle);
      this.ctx.commandHistory.execute(cmd);
    }
  }

  connect(sourceId: string, targetId: string): void {
    const cmd = new AddConnectorCommand(this.ctx, sourceId, targetId, this.connectorStyle);
    this.ctx.commandHistory.execute(cmd);
  }
}
