import { CanvasNode, CanvasEdge, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE } from '../core/data-model/types';
import { nanoid } from 'nanoid';

interface DiffOp {
  type: 'add' | 'remove' | 'rename' | 'reparent';
  nodeId?: string;
  text?: string;
  parentId?: string;
  index?: number;
}

interface MdTreeNode {
  text: string;
  depth: number;
  children: MdTreeNode[];
}

function parseMdToTree(md: string): MdTreeNode[] {
  const lines = md.split('\n');
  const roots: MdTreeNode[] = [];
  const stack: MdTreeNode[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const listMatch = line.match(/^(\s*)-\s+(.+)$/);

    if (headingMatch) {
      const depth = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const node: MdTreeNode = { text, depth, children: [] };

      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      } else {
        roots.push(node);
      }
      stack.push(node);
    } else if (listMatch && stack.length > 0) {
      const indent = listMatch[1].length;
      const text = listMatch[2].trim();
      const depth = stack[stack.length - 1].depth + 1 + Math.floor(indent / 2);
      const node: MdTreeNode = { text, depth, children: [] };

      const parent = stack[stack.length - 1];
      if (parent.children.length > 0 && indent >= 2) {
        parent.children[parent.children.length - 1].children.push(node);
      } else {
        parent.children.push(node);
      }
    }
  }

  return roots;
}

interface CanvasTreeNode {
  id: string;
  text: string;
  children: CanvasTreeNode[];
}

function buildCanvasTree(rootId: string, nodes: Record<string, CanvasNode>): CanvasTreeNode | null {
  const node = nodes[rootId];
  if (!node) return null;
  return {
    id: node.id,
    text: (node.data.text as string) || '',
    children: (node.children || [])
      .map(cid => buildCanvasTree(cid, nodes))
      .filter((n): n is CanvasTreeNode => n !== null),
  };
}

export interface SyncOps {
  nodesToAdd: { text: string; parentId: string; index: number }[];
  nodesToRemove: string[];
  nodesToRename: { id: string; text: string }[];
  nodesToReparent: { id: string; newParentId: string; index: number }[];
}

export function diffMarkdownToCanvas(
  newMd: string,
  nodes: Record<string, CanvasNode>,
  rootId: string | null
): SyncOps {
  const ops: SyncOps = {
    nodesToAdd: [],
    nodesToRemove: [],
    nodesToRename: [],
    nodesToReparent: [],
  };

  const mdTrees = parseMdToTree(newMd);
  if (mdTrees.length === 0 && !rootId) return ops;

  if (!rootId) {
    function addAllFromMd(mdNode: MdTreeNode, parentId: string, index: number) {
      ops.nodesToAdd.push({ text: mdNode.text, parentId, index });
      mdNode.children.forEach((child, i) => addAllFromMd(child, '', i));
    }
    mdTrees.forEach((root, i) => ops.nodesToAdd.push({ text: root.text, parentId: '', index: i }));
    return ops;
  }

  const canvasTree = buildCanvasTree(rootId, nodes);
  if (!canvasTree) return ops;

  function diffTree(mdNode: MdTreeNode, canvasNode: CanvasTreeNode, parentId: string) {
    if (mdNode.text !== canvasNode.text) {
      ops.nodesToRename.push({ id: canvasNode.id, text: mdNode.text });
    }

    const mdChildren = mdNode.children;
    const canvasChildren = canvasNode.children;

    const matched = new Set<number>();
    const mdMatched = new Set<number>();

    for (let mi = 0; mi < mdChildren.length; mi++) {
      for (let ci = 0; ci < canvasChildren.length; ci++) {
        if (matched.has(ci) || mdMatched.has(mi)) continue;
        if (mdChildren[mi].text === canvasChildren[ci].text) {
          matched.add(ci);
          mdMatched.add(mi);
          diffTree(mdChildren[mi], canvasChildren[ci], canvasNode.id);
          break;
        }
      }
    }

    for (let ci = 0; ci < canvasChildren.length; ci++) {
      if (!matched.has(ci)) {
        ops.nodesToRemove.push(canvasChildren[ci].id);
      }
    }

    for (let mi = 0; mi < mdChildren.length; mi++) {
      if (!mdMatched.has(mi)) {
        ops.nodesToAdd.push({ text: mdChildren[mi].text, parentId: canvasNode.id, index: mi });
      }
    }
  }

  if (mdTrees.length > 0) {
    diffTree(mdTrees[0], canvasTree, '');
  }

  return ops;
}
