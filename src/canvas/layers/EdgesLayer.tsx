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

const MindMapBranch: React.FC<{ edge: CanvasEdge; source: CanvasNode; target: CanvasNode }> = React.memo(({
  edge,
  source,
  target,
}) => {
  const sx = source.position.x + source.size.width;
  const sy = source.position.y + source.size.height / 2;
  const tx = target.position.x;
  const ty = target.position.y + target.size.height / 2;
  const cpx = (sx + tx) / 2;

  return (
    <Line
      points={[sx, sy, cpx, sy, cpx, ty, tx, ty]}
      stroke={edge.style.stroke}
      strokeWidth={edge.style.strokeWidth}
      dash={edge.style.dash}
      tension={0.4}
      lineCap="round"
    />
  );
});

const FlowchartArrow: React.FC<{ edge: CanvasEdge; source: CanvasNode; target: CanvasNode }> = React.memo(({
  edge,
  source,
  target,
}) => {
  if (edge.waypoints && edge.waypoints.length > 0) {
    const points = edge.waypoints.flatMap(p => [p.x, p.y]);
    return (
      <Arrow
        points={points}
        stroke={edge.style.stroke}
        strokeWidth={edge.style.strokeWidth}
        dash={edge.style.dash}
        fill={edge.style.stroke}
        pointerLength={8}
        pointerWidth={6}
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
      stroke={edge.style.stroke}
      strokeWidth={edge.style.strokeWidth}
      dash={edge.style.dash}
      fill={edge.style.stroke}
      pointerLength={8}
      pointerWidth={6}
    />
  );
});

const ConnectorEdge: React.FC<{ edge: CanvasEdge; source: CanvasNode; target: CanvasNode }> = React.memo(({
  edge,
  source,
  target,
}) => {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const start = getNodeEdgePoint(source, targetCenter);
  const end = getNodeEdgePoint(target, sourceCenter);

  const connectorStyle = (edge.data as any)?.connectorStyle || 'curved';
  let points: number[];

  if (connectorStyle === 'straight') {
    points = [start.x, start.y, end.x, end.y];
  } else if (connectorStyle === 'stepped') {
    const midX = (start.x + end.x) / 2;
    points = [start.x, start.y, midX, start.y, midX, end.y, end.x, end.y];
  } else {
    points = [start.x, start.y, end.x, end.y];
  }

  const hasArrow = edge.style.arrowEnd;

  if (hasArrow) {
    return (
      <Arrow
        points={points}
        stroke={edge.style.stroke}
        strokeWidth={edge.style.strokeWidth}
        dash={edge.style.dash}
        fill={edge.style.stroke}
        tension={connectorStyle === 'curved' ? 0.3 : 0}
        pointerLength={8}
        pointerWidth={6}
      />
    );
  }

  return (
    <Line
      points={points}
      stroke={edge.style.stroke}
      strokeWidth={edge.style.strokeWidth}
      dash={edge.style.dash}
      tension={connectorStyle === 'curved' ? 0.3 : 0}
      lineCap="round"
    />
  );
});

export const EdgesLayer: React.FC<{ screenWidth?: number; screenHeight?: number }> = ({ screenWidth = 1200, screenHeight = 800 }) => {
  const edges = useCanvasStore(s => s.document.edges);
  const nodes = useCanvasStore(s => s.document.nodes);
  const viewport = useCanvasStore(s => s.document.viewport);

  const visibleNodeIds = useMemo(
    () => getVisibleNodeIds(nodes, viewport, { width: screenWidth, height: screenHeight }),
    [nodes, viewport, screenWidth, screenHeight]
  );

  const visibleEdges = useMemo(() => {
    return Object.values(edges).filter(edge => {
      return visibleNodeIds.has(edge.sourceId) || visibleNodeIds.has(edge.targetId);
    });
  }, [edges, visibleNodeIds]);

  return (
    <>
      {visibleEdges.map(edge => {
        const source = nodes[edge.sourceId];
        const target = nodes[edge.targetId];
        if (!source || !target) return null;

        switch (edge.type) {
          case 'mindmap-branch':
            return <MindMapBranch key={edge.id} edge={edge} source={source} target={target} />;
          case 'flowchart-arrow':
            return <FlowchartArrow key={edge.id} edge={edge} source={source} target={target} />;
          case 'connector':
            return <ConnectorEdge key={edge.id} edge={edge} source={source} target={target} />;
          default:
            return null;
        }
      })}
    </>
  );
};
