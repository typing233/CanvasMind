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
  private oldStyle: NodeStyle;

  constructor(store: CanvasStore, nodeId: NodeId, stylePatch: Partial<NodeStyle>, capturedOldStyle: NodeStyle) {
    this.store = store;
    this.nodeId = nodeId;
    this.newStyle = stylePatch;
    this.oldStyle = capturedOldStyle;
  }

  execute(): void {
    this.store.updateNode(this.nodeId, { style: { ...this.oldStyle, ...this.newStyle } });
  }

  undo(): void {
    this.store.updateNode(this.nodeId, { style: this.oldStyle });
  }
}

export class UpdateEdgeStyleCommand implements ICommand {
  id = nanoid();
  description = 'Update edge style';
  private store: CanvasStore;
  private edgeId: EdgeId;
  private newStyle: Partial<EdgeStyle>;
  private oldStyle: EdgeStyle;

  constructor(store: CanvasStore, edgeId: EdgeId, stylePatch: Partial<EdgeStyle>, capturedOldStyle: EdgeStyle) {
    this.store = store;
    this.edgeId = edgeId;
    this.newStyle = stylePatch;
    this.oldStyle = capturedOldStyle;
  }

  execute(): void {
    this.store.updateEdge(this.edgeId, { style: { ...this.oldStyle, ...this.newStyle } });
  }

  undo(): void {
    this.store.updateEdge(this.edgeId, { style: this.oldStyle });
  }
}

export class UpdateFreehandStyleCommand implements ICommand {
  id = nanoid();
  description = 'Update freehand style';
  private store: CanvasStore;
  private nodeId: NodeId;
  private newData: Record<string, unknown>;
  private oldData: Record<string, unknown>;

  constructor(store: CanvasStore, nodeId: NodeId, dataPatch: Record<string, unknown>, capturedOldData: Record<string, unknown>) {
    this.store = store;
    this.nodeId = nodeId;
    this.newData = dataPatch;
    this.oldData = capturedOldData;
  }

  execute(): void {
    this.store.updateNode(this.nodeId, { data: { ...this.oldData, ...this.newData } });
  }

  undo(): void {
    this.store.updateNode(this.nodeId, { data: this.oldData });
  }
}
