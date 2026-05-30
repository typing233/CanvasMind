import { ICommand } from './Command';
import { CanvasStore } from '../data-model/store';
import { NodeStyle, EdgeStyle, NodeId, EdgeId } from '../data-model/types';
import { nanoid } from 'nanoid';

export class UpdateNodeStyleCommand implements ICommand {
  id = nanoid();
  description = 'Update node style';
  private store: CanvasStore;
  private nodeId: NodeId;
  private newStyle: Partial<NodeStyle>;
  private oldStyle: NodeStyle | null = null;

  constructor(store: CanvasStore, nodeId: NodeId, stylePatch: Partial<NodeStyle>) {
    this.store = store;
    this.nodeId = nodeId;
    this.newStyle = stylePatch;
  }

  execute(): void {
    const node = this.store.getNode(this.nodeId);
    if (!node) return;
    this.oldStyle = { ...node.style };
    this.store.updateNode(this.nodeId, { style: { ...node.style, ...this.newStyle } });
  }

  undo(): void {
    if (this.oldStyle) {
      this.store.updateNode(this.nodeId, { style: this.oldStyle });
    }
  }
}

export class UpdateEdgeStyleCommand implements ICommand {
  id = nanoid();
  description = 'Update edge style';
  private store: CanvasStore;
  private edgeId: EdgeId;
  private newStyle: Partial<EdgeStyle>;
  private oldStyle: EdgeStyle | null = null;

  constructor(store: CanvasStore, edgeId: EdgeId, stylePatch: Partial<EdgeStyle>) {
    this.store = store;
    this.edgeId = edgeId;
    this.newStyle = stylePatch;
  }

  execute(): void {
    const edge = this.store.getEdge(this.edgeId);
    if (!edge) return;
    this.oldStyle = { ...edge.style };
    this.store.updateEdge(this.edgeId, { style: { ...edge.style, ...this.newStyle } });
  }

  undo(): void {
    if (this.oldStyle) {
      this.store.updateEdge(this.edgeId, { style: this.oldStyle });
    }
  }
}

export class UpdateFreehandStyleCommand implements ICommand {
  id = nanoid();
  description = 'Update freehand style';
  private store: CanvasStore;
  private nodeId: NodeId;
  private newData: Record<string, unknown>;
  private oldData: Record<string, unknown> | null = null;

  constructor(store: CanvasStore, nodeId: NodeId, dataPatch: Record<string, unknown>) {
    this.store = store;
    this.nodeId = nodeId;
    this.newData = dataPatch;
  }

  execute(): void {
    const node = this.store.getNode(this.nodeId);
    if (!node) return;
    this.oldData = { ...node.data };
    this.store.updateNode(this.nodeId, { data: { ...node.data, ...this.newData } });
  }

  undo(): void {
    if (this.oldData) {
      this.store.updateNode(this.nodeId, { data: this.oldData });
    }
  }
}
