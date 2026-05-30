import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, ViewUpdate } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { useCanvasStore } from '../core/data-model/store';
import { eventBus } from '../core/event-bus/EventBus';
import { SyncEngine } from '../sync/SyncEngine';
import { useT } from '../i18n';

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
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const ignoreNextCursor = useRef(false);
  const ignoreNextDocChange = useRef(false);
  const { t } = useT();
  const [syncActive, setSyncActive] = useState(true);

  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds);
  const nodes = useCanvasStore(s => s.document.nodes);

  const syncEngine = useMemo(() => new SyncEngine(), []);
  syncEngineRef.current = syncEngine;

  useEffect(() => {
    if (!editorRef.current) return;

    syncEngine.setMarkdownUpdateCallback((md: string) => {
      const view = viewRef.current;
      if (!view) return;
      const current = view.state.doc.toString();
      if (current === md) return;
      ignoreNextDocChange.current = true;
      const cursor = view.state.selection.main.head;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: md },
        selection: { anchor: Math.min(cursor, md.length) },
      });
    });

    const docChangeListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        if (ignoreNextDocChange.current) {
          ignoreNextDocChange.current = false;
          return;
        }
        if (syncActive) {
          const text = update.state.doc.toString();
          syncEngine.onMarkdownChange(text);
        }
      }

      if (update.selectionSet) {
        if (ignoreNextCursor.current) {
          ignoreNextCursor.current = false;
          return;
        }
        const syncMap = syncEngine.getSyncMap();
        if (syncMap.size === 0) return;

        const pos = update.state.selection.main.head;
        const lineNum = update.state.doc.lineAt(pos).number - 1;

        let matchedNodeId: string | null = null;
        for (const [nodeId, mapping] of syncMap.entries()) {
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
        docChangeListener,
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

    return () => {
      view.destroy();
      syncEngine.dispose();
    };
  }, []);

  // Canvas changes → markdown
  useEffect(() => {
    if (!syncActive) return;
    const unsub = useCanvasStore.subscribe((state) => {
      syncEngineRef.current?.onCanvasChange();
    });
    return unsub;
  }, [syncActive]);

  // Selection sync: node selected on canvas → highlight in editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view || selectedNodeIds.length === 0) return;

    const syncMap = syncEngine.getSyncMap();
    const nodeId = selectedNodeIds[0];
    const mapping = syncMap.get(nodeId);
    if (!mapping) return;

    const lineCount = view.state.doc.lines;
    const targetLine = mapping.lineStart + 1;
    if (targetLine < 1 || targetLine > lineCount) return;

    const line = view.state.doc.line(targetLine);
    ignoreNextCursor.current = true;
    view.dispatch({
      selection: { anchor: line.from },
      scrollIntoView: true,
    });
  }, [selectedNodeIds]);

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">{t('markdown.title')}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${syncActive ? 'bg-green-400' : 'bg-gray-300'}`} />
          <button
            onClick={() => setSyncActive(!syncActive)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              syncActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {t('markdown.syncStatus')}
          </button>
        </div>
      </div>
      <div ref={editorRef} className="flex-1 overflow-auto" />
    </div>
  );
};
