import { CanvasNode, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE, CanvasEdge } from '../core/data-model/types';
import { nanoid } from 'nanoid';

interface MdNode {
  text: string;
  depth: number;
  children: MdNode[];
  lineStart: number;
  lineEnd: number;
}

export interface ConversionResult {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  syncMap: Map<string, { lineStart: number; lineEnd: number }>;
}

export function markdownToMindMap(markdown: string): ConversionResult {
  const lines = markdown.split('\n');
  const rootNodes: MdNode[] = [];
  const stack: MdNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const listMatch = line.match(/^(\s*)-\s+(.+)$/);

    if (headingMatch) {
      const depth = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const node: MdNode = { text, depth, children: [], lineStart: i, lineEnd: i };

      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
        stack[stack.length - 1].lineEnd = i;
      } else {
        rootNodes.push(node);
      }
      stack.push(node);
    } else if (listMatch && stack.length > 0) {
      const indent = listMatch[1].length;
      const text = listMatch[2].trim();
      const depth = stack[stack.length - 1].depth + 1 + Math.floor(indent / 2);
      const node: MdNode = { text, depth, children: [], lineStart: i, lineEnd: i };

      // Find appropriate parent based on indent
      let parent = stack[stack.length - 1];
      if (parent.children.length > 0 && indent > 0) {
        const lastChild = parent.children[parent.children.length - 1];
        if (indent >= 2) {
          lastChild.children.push(node);
        } else {
          parent.children.push(node);
        }
      } else {
        parent.children.push(node);
      }
    }
  }

  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const syncMap = new Map<string, { lineStart: number; lineEnd: number }>();

  function processNode(mdNode: MdNode, parentId?: string): string {
    const id = nanoid();
    const canvasNode: CanvasNode = {
      id,
      type: 'mindmap',
      position: { x: 0, y: 0 },
      size: { width: Math.max(100, mdNode.text.length * 9 + 20), height: 40 },
      data: { text: mdNode.text, markdownLineStart: mdNode.lineStart, markdownLineEnd: mdNode.lineEnd },
      parentId,
      children: [],
      style: { ...DEFAULT_NODE_STYLE, borderRadius: 20, fill: '#EFF6FF', stroke: '#3B82F6' },
      locked: false,
    };

    nodes.push(canvasNode);
    syncMap.set(id, { lineStart: mdNode.lineStart, lineEnd: mdNode.lineEnd });

    if (parentId) {
      edges.push({
        id: nanoid(),
        type: 'mindmap-branch',
        sourceId: parentId,
        targetId: id,
        style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
      });
    }

    const childIds: string[] = [];
    mdNode.children.forEach(child => {
      const childId = processNode(child, id);
      childIds.push(childId);
    });

    canvasNode.children = childIds;
    return id;
  }

  if (rootNodes.length > 0) {
    rootNodes.forEach(root => processNode(root));
  }

  return { nodes, edges, syncMap };
}

export function mindMapToMarkdown(
  rootId: string,
  nodes: Record<string, CanvasNode>
): string {
  const lines: string[] = [];

  function walk(nodeId: string, depth: number): void {
    const node = nodes[nodeId];
    if (!node) return;
    const text = (node.data.text as string) || '';

    if (depth <= 6) {
      lines.push('#'.repeat(depth) + ' ' + text);
    } else {
      const indent = '  '.repeat(depth - 7);
      lines.push(indent + '- ' + text);
    }

    (node.children || []).forEach(childId => walk(childId, depth + 1));
  }

  const root = nodes[rootId];
  if (root) {
    walk(rootId, 1);
  }

  return lines.join('\n');
}
