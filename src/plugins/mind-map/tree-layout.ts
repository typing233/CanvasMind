import { CanvasNode, Point } from '../../core/data-model/types';

interface LayoutNode {
  id: string;
  children: LayoutNode[];
  x: number;
  y: number;
  width: number;
  height: number;
  mod: number;
  prelim: number;
}

const H_SPACING = 60;
const V_SPACING = 30;

function buildLayoutTree(
  nodeId: string,
  nodes: Record<string, CanvasNode>
): LayoutNode | null {
  const node = nodes[nodeId];
  if (!node) return null;
  const children = (node.children || [])
    .map(cid => buildLayoutTree(cid, nodes))
    .filter(Boolean) as LayoutNode[];

  return {
    id: nodeId,
    children,
    x: 0,
    y: 0,
    width: node.size.width,
    height: node.size.height,
    mod: 0,
    prelim: 0,
  };
}

function firstPass(tree: LayoutNode, depth: number = 0): void {
  tree.y = depth;

  if (tree.children.length === 0) {
    tree.prelim = 0;
    return;
  }

  tree.children.forEach((child, _i) => {
    firstPass(child, depth + 1);
  });

  if (tree.children.length === 1) {
    tree.prelim = tree.children[0].prelim;
  } else {
    const first = tree.children[0];
    const last = tree.children[tree.children.length - 1];
    tree.prelim = (first.prelim + last.prelim + (last.height - first.height) / 2) / 2;
  }

  // Separate subtrees
  for (let i = 1; i < tree.children.length; i++) {
    const prev = tree.children[i - 1];
    const curr = tree.children[i];
    const minSep = prev.height / 2 + curr.height / 2 + V_SPACING;
    const diff = prev.prelim + minSep - curr.prelim;
    if (diff > 0) {
      curr.prelim += diff;
      // Adjust all subsequent siblings
      for (let j = i + 1; j < tree.children.length; j++) {
        tree.children[j].prelim += diff;
      }
    }
  }

  // Recalculate parent
  const first = tree.children[0];
  const last = tree.children[tree.children.length - 1];
  tree.prelim = (first.prelim + last.prelim) / 2;
}

function secondPass(tree: LayoutNode, modSum: number = 0): void {
  tree.y = tree.prelim + modSum;
  tree.children.forEach(child => {
    secondPass(child, modSum + tree.mod);
  });
}

function assignX(tree: LayoutNode, depth: number = 0): void {
  tree.x = depth * (tree.width + H_SPACING);
  tree.children.forEach(child => assignX(child, depth + 1));
}

function collectPositions(tree: LayoutNode, result: Map<string, Point>): void {
  result.set(tree.id, { x: tree.x, y: tree.y });
  tree.children.forEach(child => collectPositions(child, result));
}

export function computeTreeLayout(
  rootId: string,
  nodes: Record<string, CanvasNode>,
  origin: Point = { x: 100, y: 100 }
): Map<string, Point> {
  const tree = buildLayoutTree(rootId, nodes);
  if (!tree) return new Map();

  firstPass(tree);
  secondPass(tree);
  assignX(tree);

  const positions = new Map<string, Point>();
  collectPositions(tree, positions);

  // Normalize: find min y, offset all to origin
  let minY = Infinity;
  positions.forEach(p => {
    if (p.y < minY) minY = p.y;
  });

  const result = new Map<string, Point>();
  positions.forEach((p, id) => {
    result.set(id, {
      x: p.x + origin.x,
      y: p.y - minY + origin.y,
    });
  });

  return result;
}
