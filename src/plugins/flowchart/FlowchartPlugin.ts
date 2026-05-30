import { IPlugin, PluginContext } from '../../core/plugin-system/types';
import { CanvasNode, CanvasEdge, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE, NodeId, Point } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { nanoid } from 'nanoid';

function computeOrthogonalRoute(source: CanvasNode, target: CanvasNode): Point[] {
  const sx = source.position.x + source.size.width / 2;
  const sy = source.position.y + source.size.height;
  const tx = target.position.x + target.size.width / 2;
  const ty = target.position.y;

  const midY = (sy + ty) / 2;

  if (Math.abs(sx - tx) < 5) {
    return [
      { x: sx, y: sy },
      { x: tx, y: ty },
    ];
  }

  return [
    { x: sx, y: sy },
    { x: sx, y: midY },
    { x: tx, y: midY },
    { x: tx, y: ty },
  ];
}

class AddFlowchartNodeCommand implements ICommand {
  id = nanoid();
  description: string;
  private node: CanvasNode;
  private ctx: PluginContext;

  constructor(ctx: PluginContext, type: 'flowchart-rect' | 'flowchart-diamond', text: string, position: Point) {
    this.ctx = ctx;
    const isRect = type === 'flowchart-rect';
    this.node = {
      id: nanoid(),
      type,
      position,
      size: isRect ? { width: 140, height: 60 } : { width: 120, height: 80 },
      data: { text },
      style: {
        ...DEFAULT_NODE_STYLE,
        fill: isRect ? '#F0FDF4' : '#FEF3C7',
        stroke: isRect ? '#16A34A' : '#D97706',
        borderRadius: isRect ? 4 : 0,
      },
      locked: false,
    };
    this.description = `Add ${isRect ? 'rectangle' : 'diamond'} "${text}"`;
  }

  getNodeId(): string {
    return this.node.id;
  }

  execute(): void {
    this.ctx.store.addNode(this.node);
  }

  undo(): void {
    this.ctx.store.removeNode(this.node.id);
  }
}

class AddFlowchartEdgeCommand implements ICommand {
  id = nanoid();
  description = 'Add flowchart connection';
  private edge: CanvasEdge;
  private ctx: PluginContext;

  constructor(ctx: PluginContext, sourceId: NodeId, targetId: NodeId) {
    this.ctx = ctx;
    const source = ctx.store.getNode(sourceId)!;
    const target = ctx.store.getNode(targetId)!;
    const waypoints = computeOrthogonalRoute(source, target);

    this.edge = {
      id: nanoid(),
      type: 'flowchart-arrow',
      sourceId,
      targetId,
      waypoints,
      style: { ...DEFAULT_EDGE_STYLE },
    };
  }

  execute(): void {
    this.ctx.store.addEdge(this.edge);
  }

  undo(): void {
    this.ctx.store.removeEdge(this.edge.id);
  }
}

class RemoveFlowchartNodeCommand implements ICommand {
  id = nanoid();
  description = 'Remove flowchart node';
  private ctx: PluginContext;
  private nodeId: NodeId;
  private node: CanvasNode | null = null;
  private removedEdges: CanvasEdge[] = [];

  constructor(ctx: PluginContext, nodeId: NodeId) {
    this.ctx = ctx;
    this.nodeId = nodeId;
  }

  execute(): void {
    this.node = this.ctx.store.getNode(this.nodeId) || null;
    const allEdges = Object.values(this.ctx.store.document.edges);
    this.removedEdges = allEdges.filter(
      e => e.sourceId === this.nodeId || e.targetId === this.nodeId
    );
    this.removedEdges.forEach(e => this.ctx.store.removeEdge(e.id));
    this.ctx.store.removeNode(this.nodeId);
  }

  undo(): void {
    if (this.node) {
      this.ctx.store.addNode(this.node);
    }
    this.removedEdges.forEach(e => this.ctx.store.addEdge(e));
  }
}

export class FlowchartPlugin implements IPlugin {
  id = 'flowchart';
  name = 'Flowchart';
  version = '1.0.0';
  private ctx!: PluginContext;
  private active = false;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  destroy(): void {
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  addRectangle(text: string, position: Point): string {
    const cmd = new AddFlowchartNodeCommand(this.ctx, 'flowchart-rect', text, position);
    this.ctx.commandHistory.execute(cmd);
    return cmd.getNodeId();
  }

  addDiamond(text: string, position: Point): string {
    const cmd = new AddFlowchartNodeCommand(this.ctx, 'flowchart-diamond', text, position);
    this.ctx.commandHistory.execute(cmd);
    return cmd.getNodeId();
  }

  connect(sourceId: NodeId, targetId: NodeId): void {
    const cmd = new AddFlowchartEdgeCommand(this.ctx, sourceId, targetId);
    this.ctx.commandHistory.execute(cmd);
  }

  removeNode(nodeId: NodeId): void {
    const cmd = new RemoveFlowchartNodeCommand(this.ctx, nodeId);
    this.ctx.commandHistory.execute(cmd);
  }

  rerouteEdges(): void {
    const edges = Object.values(this.ctx.store.document.edges).filter(e => e.type === 'flowchart-arrow');
    edges.forEach(edge => {
      const source = this.ctx.store.getNode(edge.sourceId);
      const target = this.ctx.store.getNode(edge.targetId);
      if (source && target) {
        const waypoints = computeOrthogonalRoute(source, target);
        this.ctx.store.updateEdge(edge.id, { waypoints });
      }
    });
  }
}
