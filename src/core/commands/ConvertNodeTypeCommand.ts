import { ICommand } from './Command';
import { CanvasStore } from '../data-model/store';
import { CanvasNode, CanvasEdge, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE, NodeId } from '../data-model/types';
import { nanoid } from 'nanoid';

export class ConvertNodeTypeCommand implements ICommand {
  id = nanoid();
  description = 'Convert node type';
  private store: CanvasStore;
  private nodeId: NodeId;
  private targetType: string;
  private oldNode: CanvasNode | null = null;
  private removedEdges: CanvasEdge[] = [];
  private addedEdges: CanvasEdge[] = [];
  private parentChildUpdate: { parentId: string; oldChildren: string[] } | null = null;

  constructor(store: CanvasStore, nodeId: NodeId, targetType: string) {
    this.store = store;
    this.nodeId = nodeId;
    this.targetType = targetType;
  }

  execute(): void {
    const node = this.store.getNode(this.nodeId);
    if (!node) return;
    this.oldNode = { ...node, children: node.children ? [...node.children] : undefined };

    if (node.type === 'mindmap' && this.targetType === 'flowchart-rect') {
      this.convertMindmapToFlowchart(node);
    } else if ((node.type === 'flowchart-rect' || node.type === 'flowchart-diamond') && this.targetType === 'mindmap') {
      this.convertFlowchartToMindmap(node);
    }
  }

  private convertMindmapToFlowchart(node: CanvasNode): void {
    if (node.parentId) {
      const parent = this.store.getNode(node.parentId);
      if (parent) {
        this.parentChildUpdate = { parentId: parent.id, oldChildren: [...(parent.children || [])] };
        this.store.updateNode(parent.id, {
          children: (parent.children || []).filter(id => id !== this.nodeId),
        });
      }
    }

    const edges = Object.values(this.store.document.edges);
    edges.filter(e => e.type === 'mindmap-branch' && (e.sourceId === this.nodeId || e.targetId === this.nodeId))
      .forEach(e => {
        this.removedEdges.push(e);
        this.store.removeEdge(e.id);
      });

    this.store.updateNode(this.nodeId, {
      type: 'flowchart-rect' as any,
      parentId: undefined,
      children: undefined,
      style: {
        ...DEFAULT_NODE_STYLE,
        fill: '#F0FDF4',
        stroke: '#16A34A',
        borderRadius: 4,
      },
    });
  }

  private convertFlowchartToMindmap(node: CanvasNode): void {
    const edges = Object.values(this.store.document.edges);
    edges.filter(e => e.type === 'flowchart-arrow' && (e.sourceId === this.nodeId || e.targetId === this.nodeId))
      .forEach(e => {
        this.removedEdges.push(e);
        this.store.removeEdge(e.id);
      });

    this.store.updateNode(this.nodeId, {
      type: 'mindmap' as any,
      children: [],
      style: {
        ...DEFAULT_NODE_STYLE,
        borderRadius: 20,
        fill: '#EFF6FF',
        stroke: '#3B82F6',
      },
    });
  }

  undo(): void {
    if (!this.oldNode) return;

    this.addedEdges.forEach(e => this.store.removeEdge(e.id));

    this.store.updateNode(this.nodeId, {
      type: this.oldNode.type,
      parentId: this.oldNode.parentId,
      children: this.oldNode.children,
      style: this.oldNode.style,
    });

    this.removedEdges.forEach(e => this.store.addEdge(e));

    if (this.parentChildUpdate) {
      this.store.updateNode(this.parentChildUpdate.parentId, {
        children: this.parentChildUpdate.oldChildren,
      });
    }
  }
}
