import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Group, Rect, Text, Line, Circle, Image as KonvaImage } from 'react-konva';
import { useCanvasStore } from '../../core/data-model/store';
import { CanvasNode } from '../../core/data-model/types';
import { eventBus } from '../../core/event-bus/EventBus';
import { getVisibleNodeIds } from '../culling/ViewportCuller';
import { DragReorderHandler, DropTarget } from '../../plugins/mind-map/DragReorderHandler';

interface ShapeProps {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (e: any) => void;
  onDragEnd: (e: any) => void;
  onDragMove?: (e: any) => void;
  onDragStart?: (e: any) => void;
  draggable: boolean;
}

const MindMapNodeShape: React.FC<ShapeProps> = React.memo(({ node, isSelected, onSelect, onDragEnd, onDragMove, onDragStart, draggable }) => {
  const text = (node.data.text as string) || '';
  return (
    <Group
      x={node.position.x}
      y={node.position.y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
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
});

const FlowchartRectShape: React.FC<ShapeProps> = React.memo(({ node, isSelected, onSelect, onDragEnd, draggable }) => {
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
});

const FlowchartDiamondShape: React.FC<ShapeProps> = React.memo(({ node, isSelected, onSelect, onDragEnd, draggable }) => {
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
});

const FreehandPathShape: React.FC<{ node: CanvasNode; isSelected: boolean; onSelect: (e: any) => void }> = React.memo(({
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
});

const StickyNoteShape: React.FC<ShapeProps> = React.memo(({ node, isSelected, onSelect, onDragEnd, draggable }) => {
  const text = (node.data.text as string) || '';
  const color = (node.data.color as string) || '#FEF3C7';
  return (
    <Group
      x={node.position.x}
      y={node.position.y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      rotation={(node.data.rotation as number) || 0}
    >
      <Rect
        width={node.size.width}
        height={node.size.height}
        fill={color}
        stroke={isSelected ? '#3B82F6' : '#D97706'}
        strokeWidth={isSelected ? 2 : 1}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={6}
        shadowOffsetY={3}
      />
      <Text
        text={text}
        width={node.size.width}
        height={node.size.height}
        align="left"
        verticalAlign="top"
        fontSize={node.style.fontSize || 13}
        fill={node.style.fontColor || '#1F2937'}
        padding={10}
      />
    </Group>
  );
});

const ImageNodeShape: React.FC<ShapeProps> = React.memo(({ node, isSelected, onSelect, onDragEnd, draggable }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const src = node.data.src as string;

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

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
        fill="#F3F4F6"
        stroke={isSelected ? '#3B82F6' : '#D1D5DB'}
        strokeWidth={isSelected ? 2 : 1}
      />
      {image ? (
        <KonvaImage
          image={image}
          width={node.size.width}
          height={node.size.height}
        />
      ) : (
        <Text
          text="Loading..."
          width={node.size.width}
          height={node.size.height}
          align="center"
          verticalAlign="middle"
          fontSize={12}
          fill="#9CA3AF"
        />
      )}
    </Group>
  );
});

const GeometryShape: React.FC<ShapeProps> = React.memo(({ node, isSelected, onSelect, onDragEnd, draggable }) => {
  const shape = (node.data.shape as string) || 'circle';
  const w = node.size.width;
  const h = node.size.height;
  const stroke = isSelected ? '#3B82F6' : node.style.stroke;
  const strokeWidth = isSelected ? 3 : node.style.strokeWidth;

  let shapeElement: React.ReactNode = null;

  switch (shape) {
    case 'circle':
      shapeElement = (
        <Circle
          x={w / 2} y={h / 2}
          radius={Math.min(w, h) / 2}
          fill={node.style.fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
      break;
    case 'triangle': {
      const pts = [w / 2, 0, w, h, 0, h];
      shapeElement = <Line points={pts} closed fill={node.style.fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    }
    case 'hexagon': {
      const pts = [w * 0.25, 0, w * 0.75, 0, w, h / 2, w * 0.75, h, w * 0.25, h, 0, h / 2];
      shapeElement = <Line points={pts} closed fill={node.style.fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    }
    case 'star': {
      const cx = w / 2, cy = h / 2, outerR = Math.min(w, h) / 2, innerR = outerR * 0.4;
      const pts: number[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      shapeElement = <Line points={pts} closed fill={node.style.fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    }
    case 'arrow-shape': {
      const pts = [0, h * 0.3, w * 0.6, h * 0.3, w * 0.6, 0, w, h / 2, w * 0.6, h, w * 0.6, h * 0.7, 0, h * 0.7];
      shapeElement = <Line points={pts} closed fill={node.style.fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    }
    default:
      shapeElement = <Rect width={w} height={h} fill={node.style.fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  return (
    <Group
      x={node.position.x}
      y={node.position.y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
    >
      {shapeElement}
    </Group>
  );
});

// Registry for dynamic node types from plugins
export const nodeTypeRegistry = new Map<string, React.FC<ShapeProps>>();

const dragReorderHandler = new DragReorderHandler();

export const NodesLayer: React.FC<{ screenWidth?: number; screenHeight?: number }> = ({ screenWidth = 1200, screenHeight = 800 }) => {
  const nodes = useCanvasStore(s => s.document.nodes);
  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds);
  const setSelection = useCanvasStore(s => s.setSelection);
  const updateNode = useCanvasStore(s => s.updateNode);
  const activePluginId = useCanvasStore(s => s.activePluginId);
  const viewport = useCanvasStore(s => s.document.viewport);
  const [dropIndicator, setDropIndicator] = useState<DropTarget | null>(null);

  const visibleNodeIds = useMemo(
    () => getVisibleNodeIds(nodes, viewport, { width: screenWidth, height: screenHeight }),
    [nodes, viewport, screenWidth, screenHeight]
  );

  const visibleNodes = useMemo(
    () => Object.values(nodes).filter(n => visibleNodeIds.has(n.id)),
    [nodes, visibleNodeIds]
  );

  const handleSelect = (nodeId: string, e: any) => {
    const shiftKey = e.evt?.shiftKey || false;
    if (shiftKey) {
      if (selectedNodeIds.includes(nodeId)) {
        setSelection(selectedNodeIds.filter(id => id !== nodeId), []);
      } else {
        setSelection([...selectedNodeIds, nodeId], []);
      }
    } else {
      setSelection([nodeId], []);
    }
  };

  const handleDragStart = useCallback((nodeId: string) => {
    const node = nodes[nodeId];
    if (node?.type === 'mindmap') {
      dragReorderHandler.startDrag(nodeId);
    }
  }, [nodes]);

  const handleDragMove = useCallback((nodeId: string, e: any) => {
    const node = nodes[nodeId];
    if (node?.type === 'mindmap') {
      const pos = { x: e.target.x() + node.size.width / 2, y: e.target.y() + node.size.height / 2 };
      const target = dragReorderHandler.updateDrag(pos);
      setDropIndicator(target);
    }
  }, [nodes]);

  const handleDragEnd = (nodeId: string, e: any) => {
    const newX = e.target.x();
    const newY = e.target.y();

    const node = nodes[nodeId];
    if (node?.type === 'mindmap') {
      const reparented = dragReorderHandler.endDrag();
      setDropIndicator(null);
      if (reparented) {
        eventBus.emit('mindmap:relayout', {});
      } else {
        updateNode(nodeId, { position: { x: newX, y: newY } });
        eventBus.emit('mindmap:node-moved', { nodeId });
      }
    } else {
      updateNode(nodeId, { position: { x: newX, y: newY } });
      if (node?.type === 'flowchart-rect' || node?.type === 'flowchart-diamond') {
        eventBus.emit('flowchart:node-moved', { nodeId });
      }
    }
  };

  const isDraggable = (node: CanvasNode) => {
    if (node.locked) return false;
    if (node.type === 'mindmap') return activePluginId === 'mind-map';
    if (node.type === 'flowchart-rect' || node.type === 'flowchart-diamond') return activePluginId === 'flowchart';
    if (node.type === 'sticky-note' || node.type === 'image' || node.type.startsWith('shape-')) return true;
    return false;
  };

  return (
    <>
      {visibleNodes.map(node => {
        const isSelected = selectedNodeIds.includes(node.id);
        const draggable = isDraggable(node);
        const selectHandler = (e: any) => handleSelect(node.id, e);
        const dragEndHandler = (e: any) => handleDragEnd(node.id, e);
        const dragMoveHandler = (e: any) => handleDragMove(node.id, e);
        const dragStartHandler = () => handleDragStart(node.id);

        switch (node.type) {
          case 'mindmap':
            return <MindMapNodeShape key={node.id} node={node} isSelected={isSelected} onSelect={selectHandler} onDragEnd={dragEndHandler} onDragMove={dragMoveHandler} onDragStart={dragStartHandler} draggable={draggable} />;
          case 'flowchart-rect':
            return <FlowchartRectShape key={node.id} node={node} isSelected={isSelected} onSelect={selectHandler} onDragEnd={dragEndHandler} draggable={draggable} />;
          case 'flowchart-diamond':
            return <FlowchartDiamondShape key={node.id} node={node} isSelected={isSelected} onSelect={selectHandler} onDragEnd={dragEndHandler} draggable={draggable} />;
          case 'freehand-path':
            return <FreehandPathShape key={node.id} node={node} isSelected={isSelected} onSelect={selectHandler} />;
          case 'sticky-note':
            return <StickyNoteShape key={node.id} node={node} isSelected={isSelected} onSelect={selectHandler} onDragEnd={dragEndHandler} draggable={draggable} />;
          case 'image':
            return <ImageNodeShape key={node.id} node={node} isSelected={isSelected} onSelect={selectHandler} onDragEnd={dragEndHandler} draggable={draggable} />;
          default:
            if (node.type.startsWith('shape-')) {
              return <GeometryShape key={node.id} node={node} isSelected={isSelected} onSelect={selectHandler} onDragEnd={dragEndHandler} draggable={draggable} />;
            }
            const DynamicComponent = nodeTypeRegistry.get(node.type);
            if (DynamicComponent) {
              return <DynamicComponent key={node.id} node={node} isSelected={isSelected} onSelect={selectHandler} onDragEnd={dragEndHandler} draggable={draggable} />;
            }
            return null;
        }
      })}
      {dropIndicator && (
        <Line
          points={[dropIndicator.indicator.x, dropIndicator.indicator.y - 2, dropIndicator.indicator.x + dropIndicator.indicator.width, dropIndicator.indicator.y - 2]}
          stroke="#3B82F6"
          strokeWidth={3}
          lineCap="round"
        />
      )}
    </>
  );
};
