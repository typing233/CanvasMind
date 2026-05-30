import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { useCanvasStore } from '../../core/data-model/store';
import { CanvasNode } from '../../core/data-model/types';

const MindMapNodeShape: React.FC<{ node: CanvasNode; isSelected: boolean; onSelect: () => void }> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const text = (node.data.text as string) || '';
  return (
    <Group x={node.position.x} y={node.position.y} onClick={onSelect} onTap={onSelect}>
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

const FlowchartRectShape: React.FC<{ node: CanvasNode; isSelected: boolean; onSelect: () => void }> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const text = (node.data.text as string) || '';
  return (
    <Group x={node.position.x} y={node.position.y} onClick={onSelect} onTap={onSelect}>
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
      {/* Ports */}
      <Circle x={node.size.width / 2} y={0} radius={4} fill="#6B7280" />
      <Circle x={node.size.width} y={node.size.height / 2} radius={4} fill="#6B7280" />
      <Circle x={node.size.width / 2} y={node.size.height} radius={4} fill="#6B7280" />
      <Circle x={0} y={node.size.height / 2} radius={4} fill="#6B7280" />
    </Group>
  );
};

const FlowchartDiamondShape: React.FC<{ node: CanvasNode; isSelected: boolean; onSelect: () => void }> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const text = (node.data.text as string) || '';
  const w = node.size.width;
  const h = node.size.height;
  const points = [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2];
  return (
    <Group x={node.position.x} y={node.position.y} onClick={onSelect} onTap={onSelect}>
      <Line
        points={points}
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
      <Circle x={w / 2} y={0} radius={4} fill="#6B7280" />
      <Circle x={w} y={h / 2} radius={4} fill="#6B7280" />
      <Circle x={w / 2} y={h} radius={4} fill="#6B7280" />
      <Circle x={0} y={h / 2} radius={4} fill="#6B7280" />
    </Group>
  );
};

const FreehandPathShape: React.FC<{ node: CanvasNode; isSelected: boolean; onSelect: () => void }> = ({
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

  const nodeArray = Object.values(nodes);

  return (
    <>
      {nodeArray.map(node => {
        const isSelected = selectedNodeIds.includes(node.id);
        const onSelect = () => setSelection([node.id], []);

        switch (node.type) {
          case 'mindmap':
            return <MindMapNodeShape key={node.id} node={node} isSelected={isSelected} onSelect={onSelect} />;
          case 'flowchart-rect':
            return <FlowchartRectShape key={node.id} node={node} isSelected={isSelected} onSelect={onSelect} />;
          case 'flowchart-diamond':
            return <FlowchartDiamondShape key={node.id} node={node} isSelected={isSelected} onSelect={onSelect} />;
          case 'freehand-path':
            return <FreehandPathShape key={node.id} node={node} isSelected={isSelected} onSelect={onSelect} />;
          default:
            return null;
        }
      })}
    </>
  );
};
