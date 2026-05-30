import { useCanvasStore } from '../../core/data-model/store';
import { commandHistory } from '../../core/commands/CommandHistory';
import { ReparentNodeCommand } from '../../core/commands/ReparentNodeCommand';
import { CanvasNode, Point } from '../../core/data-model/types';

export interface DropTarget {
  parentId: string;
  insertIndex: number;
  indicator: { x: number; y: number; width: number };
}

export class DragReorderHandler {
  private draggedNodeId: string | null = null;
  private dropTarget: DropTarget | null = null;

  startDrag(nodeId: string): void {
    this.draggedNodeId = nodeId;
    this.dropTarget = null;
  }

  updateDrag(position: Point): DropTarget | null {
    if (!this.draggedNodeId) return null;

    const store = useCanvasStore.getState();
    const nodes = store.document.nodes;
    const draggedNode = nodes[this.draggedNodeId];
    if (!draggedNode || draggedNode.type !== 'mindmap') return null;

    const mindmapNodes = Object.values(nodes).filter(
      n => n.type === 'mindmap' && n.id !== this.draggedNodeId
    );

    let bestTarget: DropTarget | null = null;
    let bestDist = Infinity;

    for (const candidate of mindmapNodes) {
      if (this.isDescendant(this.draggedNodeId, candidate.id, nodes)) continue;

      const cx = candidate.position.x + candidate.size.width / 2;
      const cy = candidate.position.y + candidate.size.height / 2;
      const dist = Math.hypot(position.x - cx, position.y - cy);

      if (dist < 80 && dist < bestDist) {
        bestDist = dist;

        const children = candidate.children || [];
        let insertIdx = children.length;

        for (let i = 0; i < children.length; i++) {
          const child = nodes[children[i]];
          if (child && position.y < child.position.y + child.size.height / 2) {
            insertIdx = i;
            break;
          }
        }

        bestTarget = {
          parentId: candidate.id,
          insertIndex: insertIdx,
          indicator: {
            x: candidate.position.x + candidate.size.width + 20,
            y: candidate.position.y + candidate.size.height / 2,
            width: 60,
          },
        };
      }
    }

    this.dropTarget = bestTarget;
    return bestTarget;
  }

  endDrag(): boolean {
    if (!this.draggedNodeId || !this.dropTarget) {
      this.draggedNodeId = null;
      this.dropTarget = null;
      return false;
    }

    const store = useCanvasStore.getState();
    const node = store.getNode(this.draggedNodeId);
    if (!node) {
      this.draggedNodeId = null;
      this.dropTarget = null;
      return false;
    }

    if (node.parentId === this.dropTarget.parentId) {
      const parent = store.getNode(this.dropTarget.parentId);
      if (parent) {
        const currentIdx = (parent.children || []).indexOf(this.draggedNodeId);
        if (currentIdx === this.dropTarget.insertIndex || currentIdx === this.dropTarget.insertIndex - 1) {
          this.draggedNodeId = null;
          this.dropTarget = null;
          return false;
        }
      }
    }

    const cmd = new ReparentNodeCommand(
      store, this.draggedNodeId, this.dropTarget.parentId, this.dropTarget.insertIndex
    );
    commandHistory.execute(cmd);

    this.draggedNodeId = null;
    this.dropTarget = null;
    return true;
  }

  cancelDrag(): void {
    this.draggedNodeId = null;
    this.dropTarget = null;
  }

  getDropTarget(): DropTarget | null {
    return this.dropTarget;
  }

  private isDescendant(ancestorId: string, nodeId: string, nodes: Record<string, CanvasNode>): boolean {
    const node = nodes[nodeId];
    if (!node) return false;
    if (node.parentId === ancestorId) return true;
    if (node.parentId) return this.isDescendant(ancestorId, node.parentId, nodes);
    return false;
  }
}
