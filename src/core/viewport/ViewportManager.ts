export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;

export function screenToCanvas(screenPoint: { x: number; y: number }, viewport: ViewportState) {
  return {
    x: (screenPoint.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - viewport.y) / viewport.zoom,
  };
}

export function canvasToScreen(canvasPoint: { x: number; y: number }, viewport: ViewportState) {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.x,
    y: canvasPoint.y * viewport.zoom + viewport.y,
  };
}
