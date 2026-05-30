import React, { useCallback, useRef } from 'react';
import { useCanvasStore } from '../core/data-model/store';
import { commandHistory } from '../core/commands/CommandHistory';
import { UpdateNodeStyleCommand, UpdateEdgeStyleCommand, UpdateFreehandStyleCommand } from '../core/commands/UpdateStyleCommand';
import { ConvertNodeTypeCommand } from '../core/commands/ConvertNodeTypeCommand';
import { NodeStyle, EdgeStyle } from '../core/data-model/types';
import { ColorPicker } from './style-panel/ColorPicker';
import { SliderInput } from './style-panel/SliderInput';
import { useT } from '../i18n';

export const StylePanel: React.FC = () => {
  const { t } = useT();
  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds);
  const selectedEdgeIds = useCanvasStore(s => s.selectedEdgeIds);
  const nodes = useCanvasStore(s => s.document.nodes);
  const edges = useCanvasStore(s => s.document.edges);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNode = selectedNodeIds.length > 0 ? nodes[selectedNodeIds[0]] : null;
  const selectedEdge = selectedEdgeIds.length > 0 ? edges[selectedEdgeIds[0]] : null;

  const store = useCanvasStore.getState();

  const updateNodeStyle = useCallback((patch: Partial<NodeStyle>) => {
    if (!selectedNode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const cmd = new UpdateNodeStyleCommand(store, selectedNode.id, patch);
      commandHistory.execute(cmd);
    }, 300);
    store.updateNode(selectedNode.id, { style: { ...selectedNode.style, ...patch } });
  }, [selectedNode, store]);

  const updateEdgeStyle = useCallback((patch: Partial<EdgeStyle>) => {
    if (!selectedEdge) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const cmd = new UpdateEdgeStyleCommand(store, selectedEdge.id, patch);
      commandHistory.execute(cmd);
    }, 300);
    store.updateEdge(selectedEdge.id, { style: { ...selectedEdge.style, ...patch } });
  }, [selectedEdge, store]);

  const updateFreehandData = useCallback((patch: Record<string, unknown>) => {
    if (!selectedNode || selectedNode.type !== 'freehand-path') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const cmd = new UpdateFreehandStyleCommand(store, selectedNode.id, patch);
      commandHistory.execute(cmd);
    }, 300);
    store.updateNode(selectedNode.id, { data: { ...selectedNode.data, ...patch } });
  }, [selectedNode, store]);

  if (!selectedNode && !selectedEdge) return null;

  return (
    <div className="absolute right-2 top-14 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('style.title')}</h3>

      {selectedNode && selectedNode.type !== 'freehand-path' && (
        <div className="space-y-2.5">
          <ColorPicker label="style.fill" value={selectedNode.style.fill} onChange={v => updateNodeStyle({ fill: v })} />
          <ColorPicker label="style.stroke" value={selectedNode.style.stroke} onChange={v => updateNodeStyle({ stroke: v })} />
          <SliderInput label="style.strokeWidth" value={selectedNode.style.strokeWidth} min={0} max={10} onChange={v => updateNodeStyle({ strokeWidth: v })} />
          <SliderInput label="style.fontSize" value={selectedNode.style.fontSize} min={8} max={36} onChange={v => updateNodeStyle({ fontSize: v })} />
          <ColorPicker label="style.fontColor" value={selectedNode.style.fontColor} onChange={v => updateNodeStyle({ fontColor: v })} />
          <SliderInput label="style.borderRadius" value={selectedNode.style.borderRadius} min={0} max={30} onChange={v => updateNodeStyle({ borderRadius: v })} />
        </div>
      )}

      {selectedNode && selectedNode.type === 'freehand-path' && (
        <div className="space-y-2.5">
          <ColorPicker label="style.stroke" value={(selectedNode.data.color as string) || '#000000'} onChange={v => updateFreehandData({ color: v })} />
          <SliderInput label="style.strokeWidth" value={(selectedNode.data.strokeWidth as number) || 3} min={1} max={20} onChange={v => updateFreehandData({ strokeWidth: v })} />
        </div>
      )}

      {selectedEdge && (
        <div className="space-y-2.5">
          <ColorPicker label="style.stroke" value={selectedEdge.style.stroke} onChange={v => updateEdgeStyle({ stroke: v })} />
          <SliderInput label="style.strokeWidth" value={selectedEdge.style.strokeWidth} min={1} max={10} onChange={v => updateEdgeStyle({ strokeWidth: v })} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{t('style.dash')}</span>
            <input
              type="checkbox"
              checked={!!selectedEdge.style.dash}
              onChange={e => updateEdgeStyle({ dash: e.target.checked ? [8, 4] : undefined })}
              className="w-4 h-4"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{t('style.arrowStart')}</span>
            <input
              type="checkbox"
              checked={selectedEdge.style.arrowStart}
              onChange={e => updateEdgeStyle({ arrowStart: e.target.checked })}
              className="w-4 h-4"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{t('style.arrowEnd')}</span>
            <input
              type="checkbox"
              checked={selectedEdge.style.arrowEnd}
              onChange={e => updateEdgeStyle({ arrowEnd: e.target.checked })}
              className="w-4 h-4"
            />
          </div>
        </div>
      )}

      {selectedNode && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">{t('style.nodeType')}: {selectedNode.type}</span>
          {selectedNode.type === 'mindmap' && (
            <button
              onClick={() => {
                const cmd = new ConvertNodeTypeCommand(store, selectedNode.id, 'flowchart-rect');
                commandHistory.execute(cmd);
              }}
              className="mt-1 w-full px-2 py-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-100"
            >
              {t('style.convertToFlowchart')}
            </button>
          )}
          {(selectedNode.type === 'flowchart-rect' || selectedNode.type === 'flowchart-diamond') && (
            <button
              onClick={() => {
                const cmd = new ConvertNodeTypeCommand(store, selectedNode.id, 'mindmap');
                commandHistory.execute(cmd);
              }}
              className="mt-1 w-full px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
            >
              {t('style.convertToMindmap')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
