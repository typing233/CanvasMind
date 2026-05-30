import React, { useState } from 'react';
import { useCanvasStore } from '../core/data-model/store';
import { commandHistory } from '../core/commands/CommandHistory';
import { PluginManager } from '../core/plugin-system/PluginManager';
import { MindMapPlugin } from '../plugins/mind-map/MindMapPlugin';
import { FlowchartPlugin } from '../plugins/flowchart/FlowchartPlugin';
import { FreehandPlugin } from '../plugins/freehand/FreehandPlugin';
import { screenToCanvas } from '../core/viewport/ViewportManager';
import { useT } from '../i18n';

interface ToolbarProps {
  pluginManager: PluginManager;
  mindMapPlugin: MindMapPlugin;
  flowchartPlugin: FlowchartPlugin;
  freehandPlugin: FreehandPlugin;
  onShowPlugins: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  pluginManager,
  mindMapPlugin,
  flowchartPlugin,
  freehandPlugin,
  onShowPlugins,
}) => {
  const activePluginId = useCanvasStore(s => s.activePluginId);
  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const { t } = useT();

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
      } else {
        useCanvasStore.getState().removeNode(selectedNodeIds[0]);
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

  const toolbarContributions = pluginManager.getToolbarContributions();

  const modes = [
    { id: 'mind-map', label: t('toolbar.mindMap'), icon: '🧠' },
    { id: 'flowchart', label: t('toolbar.flowchart'), icon: '📊' },
    { id: 'freehand', label: t('toolbar.freehand'), icon: '✏️' },
  ];

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-white shadow-sm">
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

      {activePluginId === 'mind-map' && (
        <div className="flex items-center gap-1">
          <button onClick={handleAddChild} className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
            {t('toolbar.addNode')}
          </button>
          <button onClick={handleDeleteNode} disabled={selectedNodeIds.length === 0}
            className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-40">
            {t('toolbar.delete')}
          </button>
        </div>
      )}

      {activePluginId === 'flowchart' && (
        <div className="flex items-center gap-1">
          <button onClick={handleAddRect} className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
            {t('toolbar.addRect')}
          </button>
          <button onClick={handleAddDiamond} className="px-2 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">
            {t('toolbar.addDiamond')}
          </button>
          <button onClick={handleConnect} disabled={selectedNodeIds.length < 2}
            className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-40">
            {t('toolbar.connect')} ({selectedNodeIds.length}/2)
          </button>
          <button onClick={handleDeleteNode} disabled={selectedNodeIds.length === 0}
            className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-40">
            {t('toolbar.delete')}
          </button>
          {selectedNodeIds.length < 2 && (
            <span className="text-xs text-gray-400 ml-1">{t('toolbar.multiSelectHint')}</span>
          )}
        </div>
      )}

      {activePluginId === 'freehand' && (
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500 mr-1">{t('toolbar.color')}</label>
          <input
            type="color"
            value={freehandPlugin.color}
            onChange={e => { freehandPlugin.color = e.target.value; }}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
          />
          <label className="text-xs text-gray-500 ml-2 mr-1">{t('toolbar.size')}</label>
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

      {toolbarContributions.length > 0 && (
        <>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <div className="flex items-center gap-1">
            {toolbarContributions.map(contrib => (
              <button
                key={contrib.id}
                onClick={contrib.onClick}
                className="px-2 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                title={contrib.label}
              >
                {contrib.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={onShowPlugins}
          className="px-2 py-1 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
        >
          🧩 {t('toolbar.plugins')}
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <button onClick={handleUndo} disabled={!canUndo}
          className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40"
          title="Ctrl+Z">
          ↩ {t('toolbar.undo')}
        </button>
        <button onClick={handleRedo} disabled={!canRedo}
          className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40"
          title="Ctrl+Y">
          ↪ {t('toolbar.redo')}
        </button>
      </div>
    </div>
  );
};
