import { CanvasNode, Point } from '../../core/data-model/types';

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

interface ScreenSize {
  width: number;
  height: number;
}

const MARGIN = 200;

export function isNodeVisible(
  node: CanvasNode,
  viewport: ViewportState,
  screenSize: ScreenSize
): boolean {
  const left = -viewport.x / viewport.zoom - MARGIN;
  const top = -viewport.y / viewport.zoom - MARGIN;
  const right = (screenSize.width - viewport.x) / viewport.zoom + MARGIN;
  const bottom = (screenSize.height - viewport.y) / viewport.zoom + MARGIN;

  return !(
    node.position.x + node.size.width < left ||
    node.position.x > right ||
    node.position.y + node.size.height < top ||
    node.position.y > bottom
  );
}

export function isEdgeVisible(
  waypoints: Point[] | undefined,
  sourceVisible: boolean,
  targetVisible: boolean
): boolean {
  if (sourceVisible || targetVisible) return true;
  return false;
}

export function getVisibleNodeIds(
  nodes: Record<string, CanvasNode>,
  viewport: ViewportState,
  screenSize: ScreenSize
): Set<string> {
  const visible = new Set<string>();
  for (const [id, node] of Object.entries(nodes)) {
    if (isNodeVisible(node, viewport, screenSize)) {
      visible.add(id);
    }
  }
  return visible;
}
