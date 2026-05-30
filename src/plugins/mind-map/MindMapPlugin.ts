import { IPlugin, PluginContext } from '../../core/plugin-system/types';
import { CanvasNode, CanvasEdge, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE, NodeId } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { computeTreeLayout } from './tree-layout';
import { nanoid } from 'nanoid';

function createMindMapNode(text: string, parentId?: string): CanvasNode {
  return {
    id: nanoid(),
    type: 'mindmap',
    position: { x: 0, y: 0 },
    size: { width: 140, height: 40 },
    data: { text },
    parentId,
    children: [],
    style: { ...DEFAULT_NODE_STYLE, borderRadius: 20, fill: '#EFF6FF', stroke: '#3B82F6' },
    locked: false,
  };
}

class AddMindMapNodeCommand implements ICommand {
  id = nanoid();
  description: string;
  private node: CanvasNode;
  private edge: CanvasEdge | null;
  private ctx: PluginContext;

  constructor(ctx: PluginContext, text: string, parentId?: string) {
    this.ctx = ctx;
    this.node = createMindMapNode(text, parentId);
    this.description = `Add mind map node "${text}"`;

    if (parentId) {
      this.edge = {
        id: nanoid(),
        type: 'mindmap-branch',
        sourceId: parentId,
        targetId: this.node.id,
        style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
      };
    } else {
      this.edge = null;
    }
  }

  getNodeId(): string {
    return this.node.id;
  }

  execute(): void {
    this.ctx.store.addNode(this.node);
    if (this.node.parentId) {
      const parent = this.ctx.store.getNode(this.node.parentId);
      if (parent) {
        this.ctx.store.updateNode(parent.id, {
          children: [...(parent.children || []), this.node.id],
        });
      }
    }
    if (this.edge) {
      this.ctx.store.addEdge(this.edge);
    }
  }

  undo(): void {
    if (this.edge) {
      this.ctx.store.removeEdge(this.edge.id);
    }
    if (this.node.parentId) {
      const parent = this.ctx.store.getNode(this.node.parentId);
      if (parent) {
        this.ctx.store.updateNode(parent.id, {
          children: (parent.children || []).filter(id => id !== this.node.id),
        });
      }
    }
    this.ctx.store.removeNode(this.node.id);
  }
}

class RemoveMindMapNodeCommand implements ICommand {
  id = nanoid();
  description: string;
  private ctx: PluginContext;
  private nodeId: NodeId;
  private removedNodes: CanvasNode[] = [];
  private removedEdges: CanvasEdge[] = [];
  private parentUpdate: { parentId: string; oldChildren: string[] } | null = null;

  constructor(ctx: PluginContext, nodeId: NodeId) {
    this.ctx = ctx;
    this.nodeId = nodeId;
    this.description = `Remove mind map node`;
  }

  private collectSubtree(nodeId: string): void {
    const node = this.ctx.store.getNode(nodeId);
    if (!node) return;
    this.removedNodes.push(node);
    (node.children || []).forEach(cid => this.collectSubtree(cid));
  }

  execute(): void {
    this.removedNodes = [];
    this.removedEdges = [];
    this.collectSubtree(this.nodeId);

    const node = this.ctx.store.getNode(this.nodeId);
    if (node?.parentId) {
      const parent = this.ctx.store.getNode(node.parentId);
      if (parent) {
        this.parentUpdate = { parentId: parent.id, oldChildren: [...(parent.children || [])] };
        this.ctx.store.updateNode(parent.id, {
          children: (parent.children || []).filter(id => id !== this.nodeId),
        });
      }
    }

    const allEdges = Object.values(this.ctx.store.document.edges);
    const removedIds = new Set(this.removedNodes.map(n => n.id));
    allEdges.forEach(edge => {
      if (removedIds.has(edge.sourceId) || removedIds.has(edge.targetId)) {
        this.removedEdges.push(edge);
        this.ctx.store.removeEdge(edge.id);
      }
    });

    this.removedNodes.forEach(n => this.ctx.store.removeNode(n.id));
  }

  undo(): void {
    this.removedNodes.forEach(n => this.ctx.store.addNode(n));
    this.removedEdges.forEach(e => this.ctx.store.addEdge(e));
    if (this.parentUpdate) {
      this.ctx.store.updateNode(this.parentUpdate.parentId, {
        children: this.parentUpdate.oldChildren,
      });
    }
  }
}

export class MindMapPlugin implements IPlugin {
  id = 'mind-map';
  name = 'Mind Map';
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

  addNode(text: string, parentId?: string): string {
    const cmd = new AddMindMapNodeCommand(this.ctx, text, parentId);
    this.ctx.commandHistory.execute(cmd);
    this.relayout();
    return cmd.getNodeId();
  }

  removeNode(nodeId: string): void {
    const node = this.ctx.store.getNode(nodeId);
    if (!node) return;
    const cmd = new RemoveMindMapNodeCommand(this.ctx, nodeId);
    this.ctx.commandHistory.execute(cmd);
    this.relayout();
  }

  relayout(): void {
    const nodes = this.ctx.store.document.nodes;
    const mindmapNodes = Object.values(nodes).filter(n => n.type === 'mindmap');
    if (mindmapNodes.length === 0) return;

    const root = mindmapNodes.find(n => !n.parentId);
    if (!root) return;

    const positions = computeTreeLayout(root.id, nodes);
    positions.forEach((pos, id) => {
      this.ctx.store.updateNode(id, { position: pos });
    });
  }

  createRootNode(text: string = 'Central Topic'): string {
    return this.addNode(text);
  }

  addChildNode(parentId: string, text: string = 'New Topic'): string {
    return this.addNode(text, parentId);
  }
}
