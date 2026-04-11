import type { ReadingPath } from "./paths";

export interface LaidOutNode {
  id: string;
  hook: string;
  depth: number;
  x: number;
  y: number;
  kind?: "category" | "node";
}

export interface LaidOutEdge {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PathLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  nodeWidth: number;
  nodeHeight: number;
  categoryNodeWidth: number;
  categoryNodeHeight: number;
  width: number;
  height: number;
  viewBox: string;
}

export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  categoryNodeWidth: number;
  categoryNodeHeight: number;
  gapX: number;
  gapY: number;
  padding: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeWidth: 190,
  nodeHeight: 74,
  categoryNodeWidth: 240,
  categoryNodeHeight: 120,
  gapX: 34,
  gapY: 58,
  padding: 18,
};

export function layoutPath(
  path: ReadingPath,
  options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS
): PathLayout {
  const { nodeWidth, nodeHeight, categoryNodeWidth, categoryNodeHeight, gapX, gapY, padding } = options;
  const srcNodes = path.nodes;

  if (srcNodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      nodeWidth,
      nodeHeight,
      categoryNodeWidth,
      categoryNodeHeight,
      width: padding * 2,
      height: padding * 2,
      viewBox: `0 0 ${padding * 2} ${padding * 2}`,
    };
  }

  const parentMap = new Map<string, string[]>();
  for (let i = 0; i < srcNodes.length; i++) {
    const n = srcNodes[i];
    if (n.parents !== undefined) {
      parentMap.set(n.id, n.parents);
    } else if (i > 0) {
      parentMap.set(n.id, [srcNodes[i - 1].id]);
    } else {
      parentMap.set(n.id, []);
    }
  }

  const childrenMap = new Map<string, string[]>();
  for (const n of srcNodes) childrenMap.set(n.id, []);
  for (const [id, parents] of parentMap) {
    for (const p of parents) {
      childrenMap.get(p)?.push(id);
    }
  }

  const depthMap = new Map<string, number>();
  for (const n of srcNodes) {
    const parents = parentMap.get(n.id) ?? [];
    if (parents.length === 0) {
      depthMap.set(n.id, 0);
    } else {
      let max = 0;
      for (const p of parents) {
        const d = depthMap.get(p);
        if (d !== undefined && d + 1 > max) max = d + 1;
      }
      depthMap.set(n.id, max);
    }
  }

  const maxDepth = Math.max(...Array.from(depthMap.values()));
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const n of srcNodes) {
    layers[depthMap.get(n.id)!].push(n.id);
  }

  const orderMap = new Map<string, number>();
  for (const layer of layers) {
    layer.forEach((id, i) => orderMap.set(id, i));
  }

  const sweepDown = () => {
    for (let d = 1; d < layers.length; d++) {
      const scored = layers[d].map((id, originalIdx) => {
        const parents = parentMap.get(id) ?? [];
        if (parents.length === 0) {
          return { id, key: orderMap.get(id) ?? originalIdx };
        }
        const mean =
          parents.reduce((sum, p) => sum + (orderMap.get(p) ?? 0), 0) /
          parents.length;
        return { id, key: mean };
      });
      scored.sort((a, b) => a.key - b.key);
      layers[d] = scored.map((s) => s.id);
      layers[d].forEach((id, i) => orderMap.set(id, i));
    }
  };

  const sweepUp = () => {
    for (let d = layers.length - 2; d >= 0; d--) {
      const scored = layers[d].map((id, originalIdx) => {
        const children = childrenMap.get(id) ?? [];
        if (children.length === 0) {
          return { id, key: orderMap.get(id) ?? originalIdx };
        }
        const mean =
          children.reduce((sum, c) => sum + (orderMap.get(c) ?? 0), 0) /
          children.length;
        return { id, key: mean };
      });
      scored.sort((a, b) => a.key - b.key);
      layers[d] = scored.map((s) => s.id);
      layers[d].forEach((id, i) => orderMap.set(id, i));
    }
  };

  sweepDown();
  sweepUp();
  sweepDown();

  const maxLayerSize = Math.max(...layers.map((l) => l.length));
  const contentWidth =
    maxLayerSize * nodeWidth + Math.max(0, maxLayerSize - 1) * gapX;
  const svgWidth = contentWidth + padding * 2;
  const svgHeight =
    layers.length * nodeHeight +
    Math.max(0, layers.length - 1) * gapY +
    padding * 2;
  const centerX = svgWidth / 2;

  const lookup = new Map(srcNodes.map((n) => [n.id, n]));
  const laidOutNodes: LaidOutNode[] = [];
  const laidOutMap = new Map<string, LaidOutNode>();

  layers.forEach((layer, d) => {
    const layerWidth = layer.length * nodeWidth + (layer.length - 1) * gapX;
    const startX = centerX - layerWidth / 2;
    layer.forEach((id, i) => {
      const src = lookup.get(id)!;
      const out: LaidOutNode = {
        id,
        hook: src.hook,
        depth: d,
        x: startX + i * (nodeWidth + gapX),
        y: padding + d * (nodeHeight + gapY),
      };
      laidOutNodes.push(out);
      laidOutMap.set(id, out);
    });
  });

  const laidOutEdges: LaidOutEdge[] = [];
  for (const n of laidOutNodes) {
    const parents = parentMap.get(n.id) ?? [];
    for (const pid of parents) {
      const parent = laidOutMap.get(pid);
      if (!parent) continue;
      laidOutEdges.push({
        from: pid,
        to: n.id,
        x1: parent.x + nodeWidth / 2,
        y1: parent.y + nodeHeight,
        x2: n.x + nodeWidth / 2,
        y2: n.y,
      });
    }
  }

  return {
    nodes: laidOutNodes,
    edges: laidOutEdges,
    nodeWidth,
    nodeHeight,
    categoryNodeWidth,
    categoryNodeHeight,
    width: svgWidth,
    height: svgHeight,
    viewBox: `0 0 ${svgWidth} ${svgHeight}`,
  };
}

export const CATEGORY_NODE_PREFIX = "__category:";

export function layoutPathWithCategory(
  path: ReadingPath,
  options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS
): PathLayout {
  const base = layoutPath(path, options);
  const { categoryNodeHeight, categoryNodeWidth, gapY, padding } = options;
  // Children are shifted down by the category's full vertical footprint so
  // the category + its edges + the first row all fit without overlap.
  const dy = categoryNodeHeight + gapY;

  const shiftedNodes: LaidOutNode[] = base.nodes.map((n) => ({
    ...n,
    kind: "node",
    y: n.y + dy,
    depth: n.depth + 1,
  }));
  const shiftedEdges: LaidOutEdge[] = base.edges.map((e) => ({
    ...e,
    y1: e.y1 + dy,
    y2: e.y2 + dy,
  }));

  const roots = shiftedNodes.filter((n) => n.depth === 1);
  const centerX = base.width / 2;

  const categoryNode: LaidOutNode = {
    id: `${CATEGORY_NODE_PREFIX}${path.id}`,
    hook: path.description,
    depth: 0,
    x: centerX - categoryNodeWidth / 2,
    y: padding,
    kind: "category",
  };

  const categoryEdges: LaidOutEdge[] = roots.map((root) => ({
    from: categoryNode.id,
    to: root.id,
    x1: centerX,
    y1: padding + categoryNodeHeight,
    x2: root.x + base.nodeWidth / 2,
    y2: root.y,
  }));

  return {
    nodes: [categoryNode, ...shiftedNodes],
    edges: [...categoryEdges, ...shiftedEdges],
    nodeWidth: base.nodeWidth,
    nodeHeight: base.nodeHeight,
    categoryNodeWidth: base.categoryNodeWidth,
    categoryNodeHeight: base.categoryNodeHeight,
    width: base.width,
    height: base.height + dy,
    viewBox: `0 0 ${base.width} ${base.height + dy}`,
  };
}

export function flipLayoutVertical(layout: PathLayout): PathLayout {
  const h = layout.height;
  const { nodeHeight } = layout;
  return {
    ...layout,
    nodes: layout.nodes.map((n) => ({
      ...n,
      y: h - n.y - nodeHeight,
    })),
    edges: layout.edges.map((e) => ({
      ...e,
      y1: h - e.y1,
      y2: h - e.y2,
    })),
    viewBox: `0 0 ${layout.width} ${h}`,
  };
}
