import { ICommand } from './Command';
import { CanvasStore } from '../data-model/store';
import { CanvasNode, CanvasEdge, DEFAULT_EDGE_STYLE, NodeId } from '../data-model/types';
import { nanoid } from 'nanoid';

export class ReparentNodeCommand implements ICommand {
  id = nanoid();
  description = 'Reparent node';
  private store: CanvasStore;
  private nodeId: NodeId;
  private newParentId: NodeId;
  private insertIndex: number;
  private oldParentId: string | undefined;
  private oldIndex: number = -1;
  private removedEdge: CanvasEdge | null = null;
  private addedEdge: CanvasEdge | null = null;

  constructor(store: CanvasStore, nodeId: NodeId, newParentId: NodeId, insertIndex: number) {
    this.store = store;
    this.nodeId = nodeId;
    this.newParentId = newParentId;
    this.insertIndex = insertIndex;
  }

  execute(): void {
    const node = this.store.getNode(this.nodeId);
    if (!node) return;

    this.oldParentId = node.parentId;

    if (this.oldParentId) {
      const oldParent = this.store.getNode(this.oldParentId);
      if (oldParent) {
        const oldChildren = oldParent.children || [];
        this.oldIndex = oldChildren.indexOf(this.nodeId);
        this.store.updateNode(this.oldParentId, {
          children: oldChildren.filter(id => id !== this.nodeId),
        });
      }

      const edges = Object.values(this.store.document.edges);
      const existingEdge = edges.find(
        e => e.type === 'mindmap-branch' && e.sourceId === this.oldParentId && e.targetId === this.nodeId
      );
      if (existingEdge) {
        this.removedEdge = existingEdge;
        this.store.removeEdge(existingEdge.id);
      }
    }

    const newParent = this.store.getNode(this.newParentId);
    if (newParent) {
      const newChildren = [...(newParent.children || [])];
      newChildren.splice(this.insertIndex, 0, this.nodeId);
      this.store.updateNode(this.newParentId, { children: newChildren });
    }

    this.store.updateNode(this.nodeId, { parentId: this.newParentId });

    const edge: CanvasEdge = {
      id: nanoid(),
      type: 'mindmap-branch',
      sourceId: this.newParentId,
      targetId: this.nodeId,
      style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
    };
    this.addedEdge = edge;
    this.store.addEdge(edge);
  }

  undo(): void {
    if (this.addedEdge) {
      this.store.removeEdge(this.addedEdge.id);
    }

    const newParent = this.store.getNode(this.newParentId);
    if (newParent) {
      this.store.updateNode(this.newParentId, {
        children: (newParent.children || []).filter(id => id !== this.nodeId),
      });
    }

    if (this.oldParentId) {
      const oldParent = this.store.getNode(this.oldParentId);
      if (oldParent) {
        const children = [...(oldParent.children || [])];
        children.splice(this.oldIndex, 0, this.nodeId);
        this.store.updateNode(this.oldParentId, { children });
      }
      this.store.updateNode(this.nodeId, { parentId: this.oldParentId });

      if (this.removedEdge) {
        this.store.addEdge(this.removedEdge);
      }
    } else {
      this.store.updateNode(this.nodeId, { parentId: undefined });
    }
  }
}
