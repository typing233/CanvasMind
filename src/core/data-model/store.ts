import { create } from 'zustand';
import { CanvasDocument, CanvasNode, CanvasEdge, NodeId, EdgeId } from './types';
import { nanoid } from 'nanoid';

export interface CanvasStore {
  document: CanvasDocument;
  activePluginId: string | null;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  addNode(node: CanvasNode): void;
  updateNode(id: NodeId, patch: Partial<CanvasNode>): void;
  removeNode(id: NodeId): void;
  addEdge(edge: CanvasEdge): void;
  updateEdge(id: EdgeId, patch: Partial<CanvasEdge>): void;
  removeEdge(id: EdgeId): void;
  setSelection(nodeIds: string[], edgeIds: string[]): void;
  setActivePlugin(pluginId: string | null): void;
  setViewport(viewport: { x: number; y: number; zoom: number }): void;
  loadDocument(doc: CanvasDocument): void;
  getNode(id: NodeId): CanvasNode | undefined;
  getEdge(id: EdgeId): CanvasEdge | undefined;
}

function createEmptyDocument(): CanvasDocument {
  return {
    id: nanoid(),
    name: 'Untitled',
    nodes: {},
    edges: {},
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  document: createEmptyDocument(),
  activePluginId: null,
  selectedNodeIds: [],
  selectedEdgeIds: [],

  addNode(node) {
    set(state => ({
      document: {
        ...state.document,
        nodes: { ...state.document.nodes, [node.id]: node },
      },
    }));
  },

  updateNode(id, patch) {
    set(state => {
      const existing = state.document.nodes[id];
      if (!existing) return state;
      return {
        document: {
          ...state.document,
          nodes: {
            ...state.document.nodes,
            [id]: { ...existing, ...patch },
          },
        },
      };
    });
  },

  removeNode(id) {
    set(state => {
      const { [id]: _, ...remaining } = state.document.nodes;
      return {
        document: { ...state.document, nodes: remaining },
        selectedNodeIds: state.selectedNodeIds.filter(nid => nid !== id),
      };
    });
  },

  addEdge(edge) {
    set(state => ({
      document: {
        ...state.document,
        edges: { ...state.document.edges, [edge.id]: edge },
      },
    }));
  },

  updateEdge(id, patch) {
    set(state => {
      const existing = state.document.edges[id];
      if (!existing) return state;
      return {
        document: {
          ...state.document,
          edges: {
            ...state.document.edges,
            [id]: { ...existing, ...patch },
          },
        },
      };
    });
  },

  removeEdge(id) {
    set(state => {
      const { [id]: _, ...remaining } = state.document.edges;
      return {
        document: { ...state.document, edges: remaining },
        selectedEdgeIds: state.selectedEdgeIds.filter(eid => eid !== id),
      };
    });
  },

  setSelection(nodeIds, edgeIds) {
    set({ selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds });
  },

  setActivePlugin(pluginId) {
    set({ activePluginId: pluginId });
  },

  setViewport(viewport) {
    set(state => ({
      document: { ...state.document, viewport },
    }));
  },

  loadDocument(doc) {
    set({ document: doc, selectedNodeIds: [], selectedEdgeIds: [] });
  },

  getNode(id) {
    return get().document.nodes[id];
  },

  getEdge(id) {
    return get().document.edges[id];
  },
}));
