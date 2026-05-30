import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, ViewUpdate } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { markdownToMindMap, mindMapToMarkdown } from './markdown-to-mindmap';
import { useCanvasStore } from '../core/data-model/store';
import { commandHistory } from '../core/commands/CommandHistory';
import { ICommand } from '../core/commands/Command';
import { CanvasNode, CanvasEdge } from '../core/data-model/types';
import { computeTreeLayout } from '../plugins/mind-map/tree-layout';
import { nanoid } from 'nanoid';
import { eventBus } from '../core/event-bus/EventBus';

class BatchAddNodesCommand implements ICommand {
  id = nanoid();
  description = 'Convert markdown to mind map';
  private nodes: CanvasNode[];
  private edges: CanvasEdge[];
  private store: typeof useCanvasStore;

  constructor(nodes: CanvasNode[], edges: CanvasEdge[], store: typeof useCanvasStore) {
    this.nodes = nodes;
    this.edges = edges;
    this.store = store;
  }

  execute(): void {
    this.nodes.forEach(n => this.store.getState().addNode(n));
    this.edges.forEach(e => this.store.getState().addEdge(e));
  }

  undo(): void {
    this.edges.forEach(e => this.store.getState().removeEdge(e.id));
    [...this.nodes].reverse().forEach(n => this.store.getState().removeNode(n.id));
  }
}

const defaultMarkdown = `# Central Topic
## Branch One
### Sub Topic A
### Sub Topic B
## Branch Two
### Sub Topic C
- Detail 1
- Detail 2
## Branch Three`;

export const MarkdownPanel: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [syncMap, setSyncMap] = useState<Map<string, { lineStart: number; lineEnd: number }>>(new Map());
  const syncMapRef = useRef<Map<string, { lineStart: number; lineEnd: number }>>(new Map());
  const ignoreNextCursor = useRef(false);

  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds);
  const nodes = useCanvasStore(s => s.document.nodes);

  // Keep ref in sync with state for use in CodeMirror callbacks
  useEffect(() => {
    syncMapRef.current = syncMap;
  }, [syncMap]);

  useEffect(() => {
    if (!editorRef.current) return;

    const cursorListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (!update.selectionSet) return;
      if (ignoreNextCursor.current) {
        ignoreNextCursor.current = false;
        return;
      }

      const currentMap = syncMapRef.current;
      if (currentMap.size === 0) return;

      const pos = update.state.selection.main.head;
      const lineNum = update.state.doc.lineAt(pos).number - 1; // 0-based

      // Find the node whose line range contains this line
      let matchedNodeId: string | null = null;
      for (const [nodeId, mapping] of currentMap.entries()) {
        if (lineNum >= mapping.lineStart && lineNum <= mapping.lineEnd) {
          matchedNodeId = nodeId;
        }
      }

      if (matchedNodeId) {
        const currentSelection = useCanvasStore.getState().selectedNodeIds;
        if (currentSelection.length !== 1 || currentSelection[0] !== matchedNodeId) {
          useCanvasStore.getState().setSelection([matchedNodeId], []);
          eventBus.emit('markdown:node-located', { nodeId: matchedNodeId });
        }
      }
    });

    const state = EditorState.create({
      doc: defaultMarkdown,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        cursorListener,
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-content': { fontFamily: 'monospace', padding: '12px' },
          '.cm-gutters': { backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0' },
          '.cm-activeLine': { backgroundColor: '#f1f5f9' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => view.destroy();
  }, []);

  // Forward direction: node selected on canvas → highlight line in editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view || selectedNodeIds.length === 0) return;

    const nodeId = selectedNodeIds[0];
    const mapping = syncMap.get(nodeId);
    if (!mapping) return;

    const lineCount = view.state.doc.lines;
    const targetLine = mapping.lineStart + 1; // 1-based
    if (targetLine < 1 || targetLine > lineCount) return;

    const line = view.state.doc.line(targetLine);
    ignoreNextCursor.current = true;
    view.dispatch({
      selection: { anchor: line.from },
      scrollIntoView: true,
    });
  }, [selectedNodeIds, syncMap]);

  const handleConvert = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const text = view.state.doc.toString();
    const result = markdownToMindMap(text);

    if (result.nodes.length === 0) return;

    // Clear existing mind map nodes first
    const existingNodes = Object.values(useCanvasStore.getState().document.nodes);
    const existingEdges = Object.values(useCanvasStore.getState().document.edges);
    existingNodes.filter(n => n.type === 'mindmap').forEach(n => {
      useCanvasStore.getState().removeNode(n.id);
    });
    existingEdges.filter(e => e.type === 'mindmap-branch').forEach(e => {
      useCanvasStore.getState().removeEdge(e.id);
    });

    // Build node map for layout calculation
    const nodeMap: Record<string, CanvasNode> = {};
    result.nodes.forEach(n => { nodeMap[n.id] = n; });

    // Find root and compute layout
    const root = result.nodes.find(n => !n.parentId);
    if (root) {
      const positions = computeTreeLayout(root.id, nodeMap);
      positions.forEach((pos, id) => {
        if (nodeMap[id]) {
          nodeMap[id] = { ...nodeMap[id], position: pos };
        }
      });
    }

    const layoutedNodes = Object.values(nodeMap);
    const cmd = new BatchAddNodesCommand(layoutedNodes, result.edges, useCanvasStore);
    commandHistory.execute(cmd);
    setSyncMap(result.syncMap);
  }, []);

  const handleSyncFromCanvas = useCallback(() => {
    const mindmapNodes = Object.values(nodes).filter(n => n.type === 'mindmap');
    const root = mindmapNodes.find(n => !n.parentId);
    if (!root) return;

    const md = mindMapToMarkdown(root.id, nodes);
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: md },
      });

      // Rebuild sync map from current canvas nodes
      const newSyncMap = new Map<string, { lineStart: number; lineEnd: number }>();
      const lines = md.split('\n');
      let lineIdx = 0;

      function walkNode(nodeId: string) {
        const node = nodes[nodeId];
        if (!node) return;
        newSyncMap.set(nodeId, { lineStart: lineIdx, lineEnd: lineIdx });
        lineIdx++;
        (node.children || []).forEach(childId => walkNode(childId));
      }
      walkNode(root.id);
      setSyncMap(newSyncMap);
    }
  }, [nodes]);

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">Markdown</span>
        <div className="flex-1" />
        <button
          onClick={handleConvert}
          className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
        >
          Convert to Mind Map
        </button>
        <button
          onClick={handleSyncFromCanvas}
          className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
        >
          Sync from Canvas
        </button>
      </div>
      <div ref={editorRef} className="flex-1 overflow-auto" />
    </div>
  );
};
