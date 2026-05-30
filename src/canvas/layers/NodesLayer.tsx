import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { useCanvasStore } from '../../core/data-model/store';
import { CanvasNode } from '../../core/data-model/types';
import { eventBus } from '../../core/event-bus/EventBus';

interface ShapeProps {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (e: any) => void;
  onDragEnd: (e: any) => void;
  draggable: boolean;
}

const MindMapNodeShape: React.FC<ShapeProps> = ({ node, isSelected, onSelect, onDragEnd, draggable }) => {
  const text = (node.data.text as string) || '';
  return (
    <Group
      x={node.position.x}
      y={node.position.y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
    >
      <Rect
        width={node.size.width}
        height={node.size.height}
        fill={node.style.fill}
        stroke={isSelected ? '#3B82F6' : node.style.stroke}
        strokeWidth={isSelected ? 3 : node.style.strokeWidth}
        cornerRadius={node.style.borderRadius}
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={4}
        shadowOffsetY={2}
      />
      <Text
        text={text}
        width={node.size.width}
        height={node.size.height}
        align="center"
        verticalAlign="middle"
        fontSize={node.style.fontSize}
        fill={node.style.fontColor}
        padding={8}
      />
    </Group>
  );
};

const FlowchartRectShape: React.FC<ShapeProps> = ({ node, isSelected, onSelect, onDragEnd, draggable }) => {
  const text = (node.data.text as string) || '';
  return (
    <Group
      x={node.position.x}
      y={node.position.y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
    >
      <Rect
        width={node.size.width}
        height={node.size.height}
        fill={node.style.fill}
        stroke={isSelected ? '#3B82F6' : node.style.stroke}
        strokeWidth={isSelected ? 3 : node.style.strokeWidth}
      />
      <Text
        text={text}
        width={node.size.width}
        height={node.size.height}
        align="center"
        verticalAlign="middle"
        fontSize={node.style.fontSize}
        fill={node.style.fontColor}
        padding={8}
      />
      <Circle x={node.size.width / 2} y={0} radius={4} fill={isSelected ? '#3B82F6' : '#6B7280'} />
      <Circle x={node.size.width} y={node.size.height / 2} radius={4} fill={isSelected ? '#3B82F6' : '#6B7280'} />
      <Circle x={node.size.width / 2} y={node.size.height} radius={4} fill={isSelected ? '#3B82F6' : '#6B7280'} />
      <Circle x={0} y={node.size.height / 2} radius={4} fill={isSelected ? '#3B82F6' : '#6B7280'} />
    </Group>
  );
};

const FlowchartDiamondShape: React.FC<ShapeProps> = ({ node, isSelected, onSelect, onDragEnd, draggable }) => {
  const text = (node.data.text as string) || '';
  const w = node.size.width;
  const h = node.size.height;
  const pts = [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2];
  return (
    <Group
      x={node.position.x}
      y={node.position.y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
    >
      <Line
        points={pts}
        closed
        fill={node.style.fill}
        stroke={isSelected ? '#3B82F6' : node.style.stroke}
        strokeWidth={isSelected ? 3 : node.style.strokeWidth}
      />
      <Text
        text={text}
        width={w}
        height={h}
        align="center"
        verticalAlign="middle"
        fontSize={node.style.fontSize}
        fill={node.style.fontColor}
        padding={12}
      />
      <Circle x={w / 2} y={0} radius={4} fill={isSelected ? '#3B82F6' : '#6B7280'} />
      <Circle x={w} y={h / 2} radius={4} fill={isSelected ? '#3B82F6' : '#6B7280'} />
      <Circle x={w / 2} y={h} radius={4} fill={isSelected ? '#3B82F6' : '#6B7280'} />
      <Circle x={0} y={h / 2} radius={4} fill={isSelected ? '#3B82F6' : '#6B7280'} />
    </Group>
  );
};

const FreehandPathShape: React.FC<{ node: CanvasNode; isSelected: boolean; onSelect: (e: any) => void }> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const points = (node.data.points as number[]) || [];
  const color = (node.data.color as string) || '#000000';
  const strokeWidth = (node.data.strokeWidth as number) || 2;
  return (
    <Line
      points={points}
      stroke={isSelected ? '#3B82F6' : color}
      strokeWidth={strokeWidth}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      globalCompositeOperation="source-over"
      onClick={onSelect}
      onTap={onSelect}
    />
  );
};

export const NodesLayer: React.FC = () => {
  const nodes = useCanvasStore(s => s.document.nodes);
  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds);
  const setSelection = useCanvasStore(s => s.setSelection);
  const updateNode = useCanvasStore(s => s.updateNode);
  const activePluginId = useCanvasStore(s => s.activePluginId);

  const nodeArray = Object.values(nodes);

  const handleSelect = (nodeId: string, e: any) => {
    const shiftKey = e.evt?.shiftKey || false;
    if (shiftKey) {
      // Multi-select: toggle node in selection
      if (selectedNodeIds.includes(nodeId)) {
        setSelection(selectedNodeIds.filter(id => id !== nodeId), []);
      } else {
        setSelection([...selectedNodeIds, nodeId], []);
      }
    } else {
      setSelection([nodeId], []);
    }
  };

  const handleDragEnd = (nodeId: string, e: any) => {
    const newX = e.target.x();
    const newY = e.target.y();
    updateNode(nodeId, { position: { x: newX, y: newY } });

    // Notify plugins to update layout/routing
    const node = nodes[nodeId];
    if (node?.type === 'mindmap') {
      eventBus.emit('mindmap:node-moved', { nodeId });
    } else if (node?.type === 'flowchart-rect' || node?.type === 'flowchart-diamond') {
      eventBus.emit('flowchart:node-moved', { nodeId });
    }
  };

  // Mind map nodes: draggable only in mind-map mode
  // Flowchart nodes: draggable only in flowchart mode
  const isDraggable = (node: CanvasNode) => {
    if (node.locked) return false;
    if (node.type === 'mindmap') return activePluginId === 'mind-map';
    if (node.type === 'flowchart-rect' || node.type === 'flowchart-diamond') return activePluginId === 'flowchart';
    return false;
  };

  return (
    <>
      {nodeArray.map(node => {
        const isSelected = selectedNodeIds.includes(node.id);
        const draggable = isDraggable(node);

        switch (node.type) {
          case 'mindmap':
            return (
              <MindMapNodeShape
                key={node.id}
                node={node}
                isSelected={isSelected}
                onSelect={(e) => handleSelect(node.id, e)}
                onDragEnd={(e) => handleDragEnd(node.id, e)}
                draggable={draggable}
              />
            );
          case 'flowchart-rect':
            return (
              <FlowchartRectShape
                key={node.id}
                node={node}
                isSelected={isSelected}
                onSelect={(e) => handleSelect(node.id, e)}
                onDragEnd={(e) => handleDragEnd(node.id, e)}
                draggable={draggable}
              />
            );
          case 'flowchart-diamond':
            return (
              <FlowchartDiamondShape
                key={node.id}
                node={node}
                isSelected={isSelected}
                onSelect={(e) => handleSelect(node.id, e)}
                onDragEnd={(e) => handleDragEnd(node.id, e)}
                draggable={draggable}
              />
            );
          case 'freehand-path':
            return (
              <FreehandPathShape
                key={node.id}
                node={node}
                isSelected={isSelected}
                onSelect={(e: any) => handleSelect(node.id, e)}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
};
