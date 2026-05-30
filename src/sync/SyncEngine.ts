import { useCanvasStore } from '../core/data-model/store';
import { commandHistory } from '../core/commands/CommandHistory';
import { ICommand } from '../core/commands/Command';
import { CanvasNode, CanvasEdge, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE } from '../core/data-model/types';
import { mindMapToMarkdown, markdownToMindMap } from './markdown-serializer';
import { diffMarkdownToCanvas, SyncOps } from './diff-patch';
import { computeTreeLayout } from '../plugins/mind-map/tree-layout';
import { nanoid } from 'nanoid';

class SyncBatchCommand implements ICommand {
  id = nanoid();
  description = 'Sync markdown changes';
  private addedNodes: CanvasNode[] = [];
  private addedEdges: CanvasEdge[] = [];
  private removedNodes: CanvasNode[] = [];
  private removedEdges: CanvasEdge[] = [];
  private renamedNodes: { id: string; oldText: string; newText: string }[] = [];

  constructor(
    private ops: SyncOps,
    private store: typeof useCanvasStore
  ) {}

  execute(): void {
    const state = this.store.getState();

    this.ops.nodesToRename.forEach(({ id, text }) => {
      const node = state.getNode(id);
      if (node) {
        this.renamedNodes.push({ id, oldText: (node.data.text as string) || '', newText: text });
        state.updateNode(id, { data: { ...node.data, text } });
      }
    });

    this.ops.nodesToRemove.forEach(id => {
      const node = state.getNode(id);
      if (node) {
        this.removedNodes.push(node);
        const allEdges = Object.values(state.document.edges);
        allEdges.filter(e => e.sourceId === id || e.targetId === id).forEach(e => {
          this.removedEdges.push(e);
          state.removeEdge(e.id);
        });
        if (node.parentId) {
          const parent = state.getNode(node.parentId);
          if (parent) {
            state.updateNode(parent.id, {
              children: (parent.children || []).filter(cid => cid !== id),
            });
          }
        }
        state.removeNode(id);
      }
    });

    this.ops.nodesToAdd.forEach(({ text, parentId }) => {
      const node: CanvasNode = {
        id: nanoid(),
        type: 'mindmap',
        position: { x: 0, y: 0 },
        size: { width: Math.max(100, text.length * 9 + 20), height: 40 },
        data: { text },
        parentId: parentId || undefined,
        children: [],
        style: { ...DEFAULT_NODE_STYLE, borderRadius: 20, fill: '#EFF6FF', stroke: '#3B82F6' },
        locked: false,
      };
      this.addedNodes.push(node);
      state.addNode(node);

      if (parentId) {
        const parent = state.getNode(parentId);
        if (parent) {
          state.updateNode(parentId, {
            children: [...(parent.children || []), node.id],
          });
        }
        const edge: CanvasEdge = {
          id: nanoid(),
          type: 'mindmap-branch',
          sourceId: parentId,
          targetId: node.id,
          style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
        };
        this.addedEdges.push(edge);
        state.addEdge(edge);
      }
    });
  }

  undo(): void {
    const state = this.store.getState();

    this.addedEdges.forEach(e => state.removeEdge(e.id));
    this.addedNodes.forEach(n => {
      if (n.parentId) {
        const parent = state.getNode(n.parentId);
        if (parent) {
          state.updateNode(n.parentId, {
            children: (parent.children || []).filter(cid => cid !== n.id),
          });
        }
      }
      state.removeNode(n.id);
    });

    this.removedNodes.forEach(n => state.addNode(n));
    this.removedEdges.forEach(e => state.addEdge(e));
    this.removedNodes.forEach(n => {
      if (n.parentId) {
        const parent = state.getNode(n.parentId);
        if (parent) {
          state.updateNode(n.parentId, {
            children: [...(parent.children || []), n.id],
          });
        }
      }
    });

    this.renamedNodes.forEach(({ id, oldText }) => {
      const node = state.getNode(id);
      if (node) {
        state.updateNode(id, { data: { ...node.data, text: oldText } });
      }
    });
  }
}

export class SyncEngine {
  private updating: 'md' | 'canvas' | null = null;
  private mdDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMdSnapshot: string = '';
  private onMarkdownUpdate: ((md: string) => void) | null = null;

  setMarkdownUpdateCallback(cb: (md: string) => void) {
    this.onMarkdownUpdate = cb;
  }

  onMarkdownChange(newMd: string): void {
    if (this.updating === 'canvas') return;

    if (this.mdDebounceTimer) clearTimeout(this.mdDebounceTimer);
    this.mdDebounceTimer = setTimeout(() => {
      this.applyMarkdownToCanvas(newMd);
    }, 400);
  }

  onCanvasChange(): void {
    if (this.updating === 'md') return;

    this.updating = 'canvas';
    const nodes = useCanvasStore.getState().document.nodes;
    const mindmapNodes = Object.values(nodes).filter(n => n.type === 'mindmap');
    const root = mindmapNodes.find(n => !n.parentId);

    if (root && this.onMarkdownUpdate) {
      const md = mindMapToMarkdown(root.id, nodes);
      if (md !== this.lastMdSnapshot) {
        this.lastMdSnapshot = md;
        this.onMarkdownUpdate(md);
      }
    }
    this.updating = null;
  }

  private applyMarkdownToCanvas(newMd: string): void {
    if (newMd === this.lastMdSnapshot) return;
    this.lastMdSnapshot = newMd;
    this.updating = 'md';

    const nodes = useCanvasStore.getState().document.nodes;
    const mindmapNodes = Object.values(nodes).filter(n => n.type === 'mindmap');
    const root = mindmapNodes.find(n => !n.parentId);

    if (!root && newMd.trim()) {
      const result = markdownToMindMap(newMd);
      if (result.nodes.length > 0) {
        const nodeMap: Record<string, CanvasNode> = {};
        result.nodes.forEach(n => { nodeMap[n.id] = n; });
        const rootNode = result.nodes.find(n => !n.parentId);
        if (rootNode) {
          const positions = computeTreeLayout(rootNode.id, nodeMap, { x: 100, y: 100 });
          positions.forEach((pos, id) => {
            if (nodeMap[id]) nodeMap[id] = { ...nodeMap[id], position: pos };
          });
        }
        Object.values(nodeMap).forEach(n => useCanvasStore.getState().addNode(n));
        result.edges.forEach(e => useCanvasStore.getState().addEdge(e));
      }
    } else if (root) {
      const ops = diffMarkdownToCanvas(newMd, nodes, root.id);
      const hasOps = ops.nodesToAdd.length > 0 || ops.nodesToRemove.length > 0 ||
        ops.nodesToRename.length > 0 || ops.nodesToReparent.length > 0;

      if (hasOps) {
        const cmd = new SyncBatchCommand(ops, useCanvasStore);
        commandHistory.execute(cmd);

        const updatedNodes = useCanvasStore.getState().document.nodes;
        const updatedRoot = Object.values(updatedNodes).find(n => n.type === 'mindmap' && !n.parentId);
        if (updatedRoot) {
          const positions = computeTreeLayout(updatedRoot.id, updatedNodes, updatedRoot.position);
          positions.forEach((pos, id) => {
            useCanvasStore.getState().updateNode(id, { position: pos });
          });
        }
      }
    }

    this.updating = null;
  }

  getSyncMap(): Map<string, { lineStart: number; lineEnd: number }> {
    const nodes = useCanvasStore.getState().document.nodes;
    const mindmapNodes = Object.values(nodes).filter(n => n.type === 'mindmap');
    const root = mindmapNodes.find(n => !n.parentId);
    if (!root) return new Map();

    const syncMap = new Map<string, { lineStart: number; lineEnd: number }>();
    let lineIdx = 0;

    function walk(nodeId: string) {
      const node = nodes[nodeId];
      if (!node) return;
      syncMap.set(nodeId, { lineStart: lineIdx, lineEnd: lineIdx });
      lineIdx++;
      (node.children || []).forEach(childId => walk(childId));
    }
    walk(root.id);
    return syncMap;
  }

  dispose(): void {
    if (this.mdDebounceTimer) clearTimeout(this.mdDebounceTimer);
  }
}
