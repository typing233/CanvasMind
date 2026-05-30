export type NodeId = string;
export type EdgeId = string;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  fontSize: number;
  fontColor: string;
  borderRadius: number;
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  dash?: number[];
  arrowStart: boolean;
  arrowEnd: boolean;
}

export interface CanvasNode {
  id: NodeId;
  type: 'mindmap' | 'flowchart-rect' | 'flowchart-diamond' | 'freehand-path';
  position: Point;
  size: Size;
  data: Record<string, unknown>;
  parentId?: NodeId;
  children?: NodeId[];
  style: NodeStyle;
  locked: boolean;
}

export interface CanvasEdge {
  id: EdgeId;
  type: 'mindmap-branch' | 'flowchart-arrow';
  sourceId: NodeId;
  targetId: NodeId;
  waypoints?: Point[];
  style: EdgeStyle;
  label?: string;
}

export interface CanvasDocument {
  id: string;
  name: string;
  nodes: Record<NodeId, CanvasNode>;
  edges: Record<EdgeId, CanvasEdge>;
  viewport: { x: number; y: number; zoom: number };
}

export const DEFAULT_NODE_STYLE: NodeStyle = {
  fill: '#ffffff',
  stroke: '#374151',
  strokeWidth: 2,
  fontSize: 14,
  fontColor: '#111827',
  borderRadius: 8,
};

export const DEFAULT_EDGE_STYLE: EdgeStyle = {
  stroke: '#6B7280',
  strokeWidth: 2,
  arrowStart: false,
  arrowEnd: true,
};
