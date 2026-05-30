import { IPlugin, PluginContext } from '../../core/plugin-system/types';
import { CanvasNode, DEFAULT_NODE_STYLE, Point } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { nanoid } from 'nanoid';

function simplifyPath(points: number[], tolerance: number = 2): number[] {
  if (points.length <= 4) return points;

  const pts: Point[] = [];
  for (let i = 0; i < points.length; i += 2) {
    pts.push({ x: points[i], y: points[i + 1] });
  }

  const simplified = rdpSimplify(pts, tolerance);
  return simplified.flatMap(p => [p.x, p.y]);
}

function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);

  const num = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  return num / Math.sqrt(lenSq);
}

class AddFreehandPathCommand implements ICommand {
  id = nanoid();
  description = 'Draw freehand path';
  private node: CanvasNode;
  private ctx: PluginContext;

  constructor(ctx: PluginContext, points: number[], color: string, strokeWidth: number) {
    this.ctx = ctx;
    const simplified = simplifyPath(points);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < simplified.length; i += 2) {
      minX = Math.min(minX, simplified[i]);
      maxX = Math.max(maxX, simplified[i]);
      minY = Math.min(minY, simplified[i + 1]);
      maxY = Math.max(maxY, simplified[i + 1]);
    }

    this.node = {
      id: nanoid(),
      type: 'freehand-path',
      position: { x: minX, y: minY },
      size: { width: maxX - minX || 1, height: maxY - minY || 1 },
      data: { points: simplified, color, strokeWidth },
      style: DEFAULT_NODE_STYLE,
      locked: false,
    };
  }

  execute(): void {
    this.ctx.store.addNode(this.node);
  }

  undo(): void {
    this.ctx.store.removeNode(this.node.id);
  }
}

export class FreehandPlugin implements IPlugin {
  id = 'freehand';
  name = 'Freehand';
  version = '1.0.0';
  metadata = {
    description: 'Draw freely on the canvas with configurable brushes',
    author: 'CanvasMind',
    icon: '✏️',
    category: 'core' as const,
  };
  private ctx!: PluginContext;
  private active = false;
  currentPoints: number[] = [];
  drawing = false;
  color = '#000000';
  strokeWidth = 3;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
    this.finishStroke();
  }

  destroy(): void {
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  startStroke(x: number, y: number): void {
    this.drawing = true;
    this.currentPoints = [x, y];
  }

  addPoint(x: number, y: number): void {
    if (!this.drawing) return;
    this.currentPoints.push(x, y);
  }

  finishStroke(): void {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.currentPoints.length >= 4) {
      const cmd = new AddFreehandPathCommand(this.ctx, this.currentPoints, this.color, this.strokeWidth);
      this.ctx.commandHistory.execute(cmd);
    }
    this.currentPoints = [];
  }

  getCurrentPoints(): number[] {
    return this.currentPoints;
  }

  isDrawing(): boolean {
    return this.drawing;
  }
}
