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
    const flowchartEdges = edges.filter(
      e => e.type === 'flowchart-arrow' && (e.sourceId === this.nodeId || e.targetId === this.nodeId)
    );

    // Find incoming edges (this node is target) — the source becomes our parent
    const incomingEdges = flowchartEdges.filter(e => e.targetId === this.nodeId);
    // Find outgoing edges (this node is source) — the targets become our children
    const outgoingEdges = flowchartEdges.filter(e => e.sourceId === this.nodeId);

    // Remove all flowchart edges connected to this node
    flowchartEdges.forEach(e => {
      this.removedEdges.push(e);
      this.store.removeEdge(e.id);
    });

    // Determine parent: if there's an incoming edge from a mindmap node, use it as parent
    let parentId: string | undefined;
    for (const e of incomingEdges) {
      const sourceNode = this.store.getNode(e.sourceId);
      if (sourceNode?.type === 'mindmap') {
        parentId = sourceNode.id;
        break;
      }
    }

    // Collect child node IDs: outgoing targets that are also flowchart nodes being converted to mindmap,
    // or that are already mindmap nodes
    const childIds: string[] = [];
    for (const e of outgoingEdges) {
      const targetNode = this.store.getNode(e.targetId);
      if (targetNode && (targetNode.type === 'mindmap' || targetNode.type === 'flowchart-rect' || targetNode.type === 'flowchart-diamond')) {
        childIds.push(e.targetId);
      }
    }

    // Convert the node
    this.store.updateNode(this.nodeId, {
      type: 'mindmap' as any,
      parentId,
      children: childIds,
      style: {
        ...DEFAULT_NODE_STYLE,
        borderRadius: 20,
        fill: '#EFF6FF',
        stroke: '#3B82F6',
      },
    });

    // Attach to parent's children list
    if (parentId) {
      const parent = this.store.getNode(parentId);
      if (parent) {
        const existingChildren = parent.children || [];
        if (!existingChildren.includes(this.nodeId)) {
          this.store.updateNode(parentId, {
            children: [...existingChildren, this.nodeId],
          });
        }
      }
      // Create mindmap-branch edge from parent to this node
      const branchEdge: CanvasEdge = {
        id: nanoid(),
        type: 'mindmap-branch',
        sourceId: parentId,
        targetId: this.nodeId,
        style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
      };
      this.addedEdges.push(branchEdge);
      this.store.addEdge(branchEdge);
    }

    // Set parentId on children and create mindmap-branch edges to them
    for (const childId of childIds) {
      const child = this.store.getNode(childId);
      if (child) {
        this.store.updateNode(childId, { parentId: this.nodeId });
        // If the child is still flowchart type, convert it too
        if (child.type === 'flowchart-rect' || child.type === 'flowchart-diamond') {
          this.store.updateNode(childId, {
            type: 'mindmap' as any,
            children: child.children || [],
            style: {
              ...DEFAULT_NODE_STYLE,
              borderRadius: 20,
              fill: '#EFF6FF',
              stroke: '#3B82F6',
            },
          });
        }
      }
      const branchEdge: CanvasEdge = {
        id: nanoid(),
        type: 'mindmap-branch',
        sourceId: this.nodeId,
        targetId: childId,
        style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
      };
      this.addedEdges.push(branchEdge);
      this.store.addEdge(branchEdge);
    }
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
