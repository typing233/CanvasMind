import React, { useState } from 'react';
import { useCanvasStore } from '../core/data-model/store';
import { commandHistory } from '../core/commands/CommandHistory';
import { PluginManager } from '../core/plugin-system/PluginManager';
import { MindMapPlugin } from '../plugins/mind-map/MindMapPlugin';
import { FlowchartPlugin } from '../plugins/flowchart/FlowchartPlugin';
import { FreehandPlugin } from '../plugins/freehand/FreehandPlugin';
import { screenToCanvas } from '../core/viewport/ViewportManager';

interface ToolbarProps {
  pluginManager: PluginManager;
  mindMapPlugin: MindMapPlugin;
  flowchartPlugin: FlowchartPlugin;
  freehandPlugin: FreehandPlugin;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  pluginManager,
  mindMapPlugin,
  flowchartPlugin,
  freehandPlugin,
}) => {
  const activePluginId = useCanvasStore(s => s.activePluginId);
  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  React.useEffect(() => {
    const unsub = commandHistory.subscribe(() => {
      setCanUndo(commandHistory.canUndo());
      setCanRedo(commandHistory.canRedo());
    });
    return unsub;
  }, []);

  const handleUndo = () => commandHistory.undo();
  const handleRedo = () => commandHistory.redo();

  const handleModeSwitch = (mode: string) => {
    pluginManager.activate(mode);
  };

  const handleAddChild = () => {
    if (selectedNodeIds.length > 0) {
      mindMapPlugin.addChildNode(selectedNodeIds[0]);
    } else {
      mindMapPlugin.createRootNode();
    }
  };

  const handleDeleteNode = () => {
    if (selectedNodeIds.length > 0) {
      const node = useCanvasStore.getState().getNode(selectedNodeIds[0]);
      if (!node) return;
      if (node.type === 'mindmap') {
        mindMapPlugin.removeNode(selectedNodeIds[0]);
      } else if (node.type === 'flowchart-rect' || node.type === 'flowchart-diamond') {
        flowchartPlugin.removeNode(selectedNodeIds[0]);
      }
      useCanvasStore.getState().setSelection([], []);
    }
  };

  const viewport = useCanvasStore(s => s.document.viewport);

  const handleAddRect = () => {
    const pos = screenToCanvas({ x: 400, y: 300 }, viewport);
    flowchartPlugin.addRectangle('Process', pos);
  };

  const handleAddDiamond = () => {
    const pos = screenToCanvas({ x: 400, y: 300 }, viewport);
    flowchartPlugin.addDiamond('Decision?', pos);
  };

  const handleConnect = () => {
    if (selectedNodeIds.length >= 2) {
      flowchartPlugin.connect(selectedNodeIds[0], selectedNodeIds[1]);
    }
  };

  const modes = [
    { id: 'mind-map', label: 'Mind Map', icon: '🧠' },
    { id: 'flowchart', label: 'Flowchart', icon: '📊' },
    { id: 'freehand', label: 'Freehand', icon: '✏️' },
  ];

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-white shadow-sm">
      {/* Mode switches */}
      <div className="flex items-center gap-1 mr-4">
        {modes.map(mode => (
          <button
            key={mode.id}
            onClick={() => handleModeSwitch(mode.id)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              activePluginId === mode.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {mode.icon} {mode.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Context tools */}
      {activePluginId === 'mind-map' && (
        <div className="flex items-center gap-1">
          <button onClick={handleAddChild} className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
            + Node
          </button>
          <button onClick={handleDeleteNode} disabled={selectedNodeIds.length === 0}
            className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-40">
            Delete
          </button>
        </div>
      )}

      {activePluginId === 'flowchart' && (
        <div className="flex items-center gap-1">
          <button onClick={handleAddRect} className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
            + Rect
          </button>
          <button onClick={handleAddDiamond} className="px-2 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">
            + Diamond
          </button>
          <button onClick={handleConnect} disabled={selectedNodeIds.length < 2}
            className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-40"
            title="Select 2 nodes (Shift+Click) then connect">
            Connect ({selectedNodeIds.length}/2)
          </button>
          <button onClick={handleDeleteNode} disabled={selectedNodeIds.length === 0}
            className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-40">
            Delete
          </button>
          {selectedNodeIds.length < 2 && (
            <span className="text-xs text-gray-400 ml-1">Shift+Click to multi-select</span>
          )}
        </div>
      )}

      {activePluginId === 'freehand' && (
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500 mr-1">Color:</label>
          <input
            type="color"
            value={freehandPlugin.color}
            onChange={e => { freehandPlugin.color = e.target.value; }}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
          />
          <label className="text-xs text-gray-500 ml-2 mr-1">Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            defaultValue="3"
            onChange={e => { freehandPlugin.strokeWidth = Number(e.target.value); }}
            className="w-16"
          />
        </div>
      )}

      <div className="flex-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button onClick={handleUndo} disabled={!canUndo}
          className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40"
          title="Undo (Ctrl+Z)">
          ↩ Undo
        </button>
        <button onClick={handleRedo} disabled={!canRedo}
          className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40"
          title="Redo (Ctrl+Y)">
          ↪ Redo
        </button>
      </div>
    </div>
  );
};
