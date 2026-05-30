import React, { useMemo } from 'react';
import { Arrow, Line } from 'react-konva';
import { useCanvasStore } from '../../core/data-model/store';
import { CanvasEdge, CanvasNode } from '../../core/data-model/types';
import { getVisibleNodeIds } from '../culling/ViewportCuller';

function getNodeCenter(node: CanvasNode) {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

function getNodeEdgePoint(node: CanvasNode, targetCenter: { x: number; y: number }) {
  const cx = node.position.x + node.size.width / 2;
  const cy = node.position.y + node.size.height / 2;
  const dx = targetCenter.x - cx;
  const dy = targetCenter.y - cy;

  const hw = node.size.width / 2;
  const hh = node.size.height / 2;

  let x: number, y: number;
  const tan = Math.abs(dy / (dx || 0.001));
  if (tan <= hh / hw) {
    x = cx + (dx > 0 ? hw : -hw);
    y = cy + (dx > 0 ? hw : -hw) * (dy / (dx || 0.001));
  } else {
    y = cy + (dy > 0 ? hh : -hh);
    x = cx + (dy > 0 ? hh : -hh) * (dx / (dy || 0.001));
  }

  return { x, y };
}

interface EdgeShapeProps {
  edge: CanvasEdge;
  source: CanvasNode;
  target: CanvasNode;
  isSelected: boolean;
  onSelect: (e: any) => void;
}

const MindMapBranch: React.FC<EdgeShapeProps> = React.memo(({ edge, source, target, isSelected, onSelect }) => {
  const sx = source.position.x + source.size.width;
  const sy = source.position.y + source.size.height / 2;
  const tx = target.position.x;
  const ty = target.position.y + target.size.height / 2;
  const cpx = (sx + tx) / 2;

  return (
    <Line
      points={[sx, sy, cpx, sy, cpx, ty, tx, ty]}
      stroke={isSelected ? '#3B82F6' : edge.style.stroke}
      strokeWidth={isSelected ? edge.style.strokeWidth + 2 : edge.style.strokeWidth}
      dash={edge.style.dash}
      tension={0.4}
      lineCap="round"
      hitStrokeWidth={12}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
});

const FlowchartArrow: React.FC<EdgeShapeProps> = React.memo(({ edge, source, target, isSelected, onSelect }) => {
  const stroke = isSelected ? '#3B82F6' : edge.style.stroke;
  const strokeWidth = isSelected ? edge.style.strokeWidth + 2 : edge.style.strokeWidth;

  if (edge.waypoints && edge.waypoints.length > 0) {
    const points = edge.waypoints.flatMap(p => [p.x, p.y]);
    return (
      <Arrow
        points={points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={edge.style.dash}
        fill={stroke}
        pointerLength={8}
        pointerWidth={6}
        hitStrokeWidth={12}
        onClick={onSelect}
        onTap={onSelect}
      />
    );
  }

  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const start = getNodeEdgePoint(source, targetCenter);
  const end = getNodeEdgePoint(target, sourceCenter);

  return (
    <Arrow
      points={[start.x, start.y, end.x, end.y]}
      stroke={stroke}
      strokeWidth={strokeWidth}
      dash={edge.style.dash}
      fill={stroke}
      pointerLength={8}
      pointerWidth={6}
      hitStrokeWidth={12}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
});

const ConnectorEdge: React.FC<EdgeShapeProps> = React.memo(({ edge, source, target, isSelected, onSelect }) => {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const start = getNodeEdgePoint(source, targetCenter);
  const end = getNodeEdgePoint(target, sourceCenter);

  const connectorStyle = (edge.data as any)?.connectorStyle || 'curved';
  const stroke = isSelected ? '#3B82F6' : edge.style.stroke;
  const strokeWidth = isSelected ? edge.style.strokeWidth + 2 : edge.style.strokeWidth;
  let points: number[];

  if (connectorStyle === 'straight') {
    points = [start.x, start.y, end.x, end.y];
  } else if (connectorStyle === 'stepped') {
    const midX = (start.x + end.x) / 2;
    points = [start.x, start.y, midX, start.y, midX, end.y, end.x, end.y];
  } else {
    points = [start.x, start.y, end.x, end.y];
  }

  if (edge.style.arrowEnd) {
    return (
      <Arrow
        points={points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={edge.style.dash}
        fill={stroke}
        tension={connectorStyle === 'curved' ? 0.3 : 0}
        pointerLength={8}
        pointerWidth={6}
        hitStrokeWidth={12}
        onClick={onSelect}
        onTap={onSelect}
      />
    );
  }

  return (
    <Line
      points={points}
      stroke={stroke}
      strokeWidth={strokeWidth}
      dash={edge.style.dash}
      tension={connectorStyle === 'curved' ? 0.3 : 0}
      lineCap="round"
      hitStrokeWidth={12}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
});

export const EdgesLayer: React.FC<{ screenWidth?: number; screenHeight?: number }> = ({ screenWidth = 1200, screenHeight = 800 }) => {
  const edges = useCanvasStore(s => s.document.edges);
  const nodes = useCanvasStore(s => s.document.nodes);
  const viewport = useCanvasStore(s => s.document.viewport);
  const selectedEdgeIds = useCanvasStore(s => s.selectedEdgeIds);
  const setSelection = useCanvasStore(s => s.setSelection);

  const visibleNodeIds = useMemo(
    () => getVisibleNodeIds(nodes, viewport, { width: screenWidth, height: screenHeight }),
    [nodes, viewport, screenWidth, screenHeight]
  );

  const visibleEdges = useMemo(() => {
    return Object.values(edges).filter(edge => {
      return visibleNodeIds.has(edge.sourceId) || visibleNodeIds.has(edge.targetId);
    });
  }, [edges, visibleNodeIds]);

  const handleEdgeSelect = (edgeId: string, e: any) => {
    e.cancelBubble = true;
    setSelection([], [edgeId]);
  };

  return (
    <>
      {visibleEdges.map(edge => {
        const source = nodes[edge.sourceId];
        const target = nodes[edge.targetId];
        if (!source || !target) return null;
        const isSelected = selectedEdgeIds.includes(edge.id);
        const onSelect = (e: any) => handleEdgeSelect(edge.id, e);

        switch (edge.type) {
          case 'mindmap-branch':
            return <MindMapBranch key={edge.id} edge={edge} source={source} target={target} isSelected={isSelected} onSelect={onSelect} />;
          case 'flowchart-arrow':
            return <FlowchartArrow key={edge.id} edge={edge} source={source} target={target} isSelected={isSelected} onSelect={onSelect} />;
          case 'connector':
            return <ConnectorEdge key={edge.id} edge={edge} source={source} target={target} isSelected={isSelected} onSelect={onSelect} />;
          default:
            return null;
        }
      })}
    </>
  );
};
