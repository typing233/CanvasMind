import { CanvasNode } from '../../core/data-model/types';

const CELL_SIZE = 200;

export class SpatialIndex {
  private grid = new Map<string, Set<string>>();

  private getKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private getCells(node: CanvasNode): string[] {
    const x0 = Math.floor(node.position.x / CELL_SIZE);
    const y0 = Math.floor(node.position.y / CELL_SIZE);
    const x1 = Math.floor((node.position.x + node.size.width) / CELL_SIZE);
    const y1 = Math.floor((node.position.y + node.size.height) / CELL_SIZE);

    const cells: string[] = [];
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        cells.push(this.getKey(cx, cy));
      }
    }
    return cells;
  }

  rebuild(nodes: Record<string, CanvasNode>): void {
    this.grid.clear();
    for (const [id, node] of Object.entries(nodes)) {
      const cells = this.getCells(node);
      for (const cell of cells) {
        if (!this.grid.has(cell)) {
          this.grid.set(cell, new Set());
        }
        this.grid.get(cell)!.add(id);
      }
    }
  }

  queryRect(left: number, top: number, right: number, bottom: number): Set<string> {
    const x0 = Math.floor(left / CELL_SIZE);
    const y0 = Math.floor(top / CELL_SIZE);
    const x1 = Math.floor(right / CELL_SIZE);
    const y1 = Math.floor(bottom / CELL_SIZE);

    const result = new Set<string>();
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const cell = this.grid.get(this.getKey(cx, cy));
        if (cell) {
          for (const id of cell) {
            result.add(id);
          }
        }
      }
    }
    return result;
  }
}
