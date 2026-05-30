import { ICommand } from './Command';
import { CanvasStore } from '../data-model/store';
import { CanvasNode, CanvasEdge, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE, NodeId } from '../data-model/types';
import { nanoid } from 'nanoid';

interface NodeSnapshot {
  id: string;
  type: string;
  parentId?: string;
  children?: string[];
  style: CanvasNode['style'];
}

export class ConvertNodeTypeCommand implements ICommand {
  id = nanoid();
  description = 'Convert node type';
  private store: CanvasStore;
  private nodeId: NodeId;
  private targetType: string;
  private oldSnapshots: NodeSnapshot[] = [];
  private removedEdges: CanvasEdge[] = [];
  private addedEdges: CanvasEdge[] = [];
  private parentChildUpdates: { nodeId: string; oldChildren: string[] }[] = [];

  constructor(store: CanvasStore, nodeId: NodeId, targetType: string) {
    this.store = store;
    this.nodeId = nodeId;
    this.targetType = targetType;
  }

  execute(): void {
    const node = this.store.getNode(this.nodeId);
    if (!node) return;

    this.oldSnapshots = [];
    this.removedEdges = [];
    this.addedEdges = [];
    this.parentChildUpdates = [];

    if (node.type === 'mindmap' && this.targetType === 'flowchart-rect') {
      this.convertMindmapToFlowchart(node);
    } else if ((node.type === 'flowchart-rect' || node.type === 'flowchart-diamond') && this.targetType === 'mindmap') {
      this.convertFlowchartGraphToMindmap();
    }
  }

  private convertMindmapToFlowchart(node: CanvasNode): void {
    this.oldSnapshots.push({
      id: node.id,
      type: node.type,
      parentId: node.parentId,
      children: node.children ? [...node.children] : undefined,
      style: { ...node.style },
    });

    if (node.parentId) {
      const parent = this.store.getNode(node.parentId);
      if (parent) {
        this.parentChildUpdates.push({ nodeId: parent.id, oldChildren: [...(parent.children || [])] });
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

  private convertFlowchartGraphToMindmap(): void {
    const allEdges = Object.values(this.store.document.edges);
    const flowEdges = allEdges.filter(e => e.type === 'flowchart-arrow');

    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();
    for (const e of flowEdges) {
      if (!outgoing.has(e.sourceId)) outgoing.set(e.sourceId, []);
      outgoing.get(e.sourceId)!.push(e.targetId);
      if (!incoming.has(e.targetId)) incoming.set(e.targetId, []);
      incoming.get(e.targetId)!.push(e.sourceId);
    }

    // BFS to collect all reachable flowchart nodes from the start node
    const visited = new Set<string>();
    const queue: string[] = [this.nodeId];
    visited.add(this.nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const targets = outgoing.get(current) || [];
      for (const tid of targets) {
        if (visited.has(tid)) continue;
        const targetNode = this.store.getNode(tid);
        if (targetNode && (targetNode.type === 'flowchart-rect' || targetNode.type === 'flowchart-diamond')) {
          visited.add(tid);
          queue.push(tid);
        }
      }
    }

    // Snapshot all nodes we're about to convert
    for (const nid of visited) {
      const n = this.store.getNode(nid);
      if (n) {
        this.oldSnapshots.push({
          id: n.id,
          type: n.type,
          parentId: n.parentId,
          children: n.children ? [...n.children] : undefined,
          style: { ...n.style },
        });
      }
    }

    // Remove all flowchart-arrow edges that connect nodes in the converted set
    for (const e of flowEdges) {
      if (visited.has(e.sourceId) || visited.has(e.targetId)) {
        this.removedEdges.push(e);
        this.store.removeEdge(e.id);
      }
    }

    // Build parent-child tree: for each visited node, its parent is the first
    // incoming source that is also in the visited set (BFS order ensures tree structure)
    const parentMap = new Map<string, string>();
    const childrenMap = new Map<string, string[]>();
    for (const nid of visited) {
      childrenMap.set(nid, []);
    }

    // BFS again from root to assign tree structure (respects direction of arrows)
    const treeBfs: string[] = [this.nodeId];
    const treeVisited = new Set<string>([this.nodeId]);
    while (treeBfs.length > 0) {
      const current = treeBfs.shift()!;
      const targets = outgoing.get(current) || [];
      for (const tid of targets) {
        if (!visited.has(tid) || treeVisited.has(tid)) continue;
        treeVisited.add(tid);
        parentMap.set(tid, current);
        childrenMap.get(current)!.push(tid);
        treeBfs.push(tid);
      }
    }

    // Check if root node can attach to an existing mindmap node (incoming edge from outside)
    let externalParentId: string | undefined;
    const rootIncoming = incoming.get(this.nodeId) || [];
    for (const srcId of rootIncoming) {
      if (visited.has(srcId)) continue;
      const srcNode = this.store.getNode(srcId);
      if (srcNode?.type === 'mindmap') {
        externalParentId = srcId;
        break;
      }
    }

    // Convert all nodes
    for (const nid of visited) {
      const children = childrenMap.get(nid) || [];
      const parent = nid === this.nodeId ? externalParentId : parentMap.get(nid);

      this.store.updateNode(nid, {
        type: 'mindmap' as any,
        parentId: parent,
        children,
        style: {
          ...DEFAULT_NODE_STYLE,
          borderRadius: 20,
          fill: '#EFF6FF',
          stroke: '#3B82F6',
        },
      });
    }

    // Attach root to external parent's children list
    if (externalParentId) {
      const extParent = this.store.getNode(externalParentId);
      if (extParent) {
        const existingChildren = extParent.children || [];
        if (!existingChildren.includes(this.nodeId)) {
          this.parentChildUpdates.push({ nodeId: extParent.id, oldChildren: [...existingChildren] });
          this.store.updateNode(externalParentId, {
            children: [...existingChildren, this.nodeId],
          });
        }
      }
    }

    // Create mindmap-branch edges for all parent-child relationships
    if (externalParentId) {
      const edge: CanvasEdge = {
        id: nanoid(),
        type: 'mindmap-branch',
        sourceId: externalParentId,
        targetId: this.nodeId,
        style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
      };
      this.addedEdges.push(edge);
      this.store.addEdge(edge);
    }

    for (const [parentId, children] of childrenMap) {
      for (const childId of children) {
        const edge: CanvasEdge = {
          id: nanoid(),
          type: 'mindmap-branch',
          sourceId: parentId,
          targetId: childId,
          style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
        };
        this.addedEdges.push(edge);
        this.store.addEdge(edge);
      }
    }
  }

  undo(): void {
    if (this.oldSnapshots.length === 0) return;

    // Remove added edges
    this.addedEdges.forEach(e => this.store.removeEdge(e.id));

    // Restore all node snapshots
    for (const snap of this.oldSnapshots) {
      this.store.updateNode(snap.id, {
        type: snap.type as any,
        parentId: snap.parentId,
        children: snap.children,
        style: snap.style,
      });
    }

    // Restore removed edges
    this.removedEdges.forEach(e => this.store.addEdge(e));

    // Restore parent children arrays
    for (const update of this.parentChildUpdates) {
      this.store.updateNode(update.nodeId, {
        children: update.oldChildren,
      });
    }
  }
}
