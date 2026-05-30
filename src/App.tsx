import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { InfiniteCanvas } from './canvas/InfiniteCanvas';
import { MarkdownPanel } from './panels/MarkdownPanel';
import { Toolbar } from './ui/Toolbar';
import { PluginManager } from './core/plugin-system/PluginManager';
import { MindMapPlugin } from './plugins/mind-map/MindMapPlugin';
import { FlowchartPlugin } from './plugins/flowchart/FlowchartPlugin';
import { FreehandPlugin } from './plugins/freehand/FreehandPlugin';
import { useCanvasStore } from './core/data-model/store';
import { eventBus } from './core/event-bus/EventBus';
import { commandHistory } from './core/commands/CommandHistory';

const STORAGE_KEY = 'canvasmind-document';

export default function App() {
  const [panelWidth, setPanelWidth] = useState(350);
  const [showPanel, setShowPanel] = useState(true);
  const resizing = useRef(false);

  const store = useCanvasStore.getState();

  const mindMapPlugin = useMemo(() => new MindMapPlugin(), []);
  const flowchartPlugin = useMemo(() => new FlowchartPlugin(), []);
  const freehandPlugin = useMemo(() => new FreehandPlugin(), []);

  const pluginManager = useMemo(() => {
    const pm = new PluginManager(store, eventBus, commandHistory);
    pm.register(mindMapPlugin);
    pm.register(flowchartPlugin);
    pm.register(freehandPlugin);
    return pm;
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const doc = JSON.parse(saved);
        useCanvasStore.getState().loadDocument(doc);
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    const unsub = useCanvasStore.subscribe(state => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.document));
      } catch { /* quota exceeded */ }
    });
    return unsub;
  }, []);

  useEffect(() => {
    pluginManager.activate('mind-map');
  }, [pluginManager]);

  // Wire freehand events from canvas to plugin
  useEffect(() => {
    const offStart = eventBus.on('freehand:start', (point: any) => {
      if (freehandPlugin.isActive()) {
        freehandPlugin.startStroke(point.x, point.y);
      }
    });
    const offEnd = eventBus.on('freehand:end', (points: any) => {
      if (freehandPlugin.isActive() && points.length >= 4) {
        freehandPlugin.currentPoints = points;
        freehandPlugin.drawing = true;
        freehandPlugin.finishStroke();
      }
    });
    return () => { offStart(); offEnd(); };
  }, [freehandPlugin]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const editorEl = (e.target as HTMLElement)?.closest?.('.cm-editor');
      if (editorEl) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            commandHistory.redo();
          } else {
            commandHistory.undo();
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          commandHistory.redo();
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = useCanvasStore.getState().selectedNodeIds;
        if (selected.length > 0) {
          const node = useCanvasStore.getState().getNode(selected[0]);
          if (node?.type === 'mindmap') {
            mindMapPlugin.removeNode(selected[0]);
          } else if (node?.type === 'flowchart-rect' || node?.type === 'flowchart-diamond') {
            flowchartPlugin.removeNode(selected[0]);
          } else if (node?.type === 'freehand-path') {
            useCanvasStore.getState().removeNode(selected[0]);
          }
          useCanvasStore.getState().setSelection([], []);
        }
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const activePlugin = useCanvasStore.getState().activePluginId;
        if (activePlugin === 'mind-map') {
          const selected = useCanvasStore.getState().selectedNodeIds;
          if (selected.length > 0) {
            mindMapPlugin.addChildNode(selected[0]);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mindMapPlugin, flowchartPlugin]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    resizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const diff = startX - ev.clientX;
      setPanelWidth(Math.max(200, Math.min(600, startWidth + diff)));
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <Toolbar
        pluginManager={pluginManager}
        mindMapPlugin={mindMapPlugin}
        flowchartPlugin={flowchartPlugin}
        freehandPlugin={freehandPlugin}
      />
      <div className="flex flex-1 overflow-hidden">
        <InfiniteCanvas />
        {showPanel && (
          <>
            <div
              className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-300 transition-colors"
              onMouseDown={handleResizeStart}
            />
            <div style={{ width: panelWidth }} className="flex-shrink-0">
              <MarkdownPanel />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-1 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <span>CanvasMind - Plugin Whiteboard Engine</span>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
        >
          {showPanel ? 'Hide Panel' : 'Show Panel'}
        </button>
      </div>
    </div>
  );
}
