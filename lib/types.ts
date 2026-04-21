export interface NodeConnection {
  target: string;
  reason: string;
}

export interface NodeFrontmatter {
  id: string;
  title: string;
  category: string;
  connections: NodeConnection[];
}

export interface NodeData {
  frontmatter: NodeFrontmatter;
  content: string;
  slug: string;
}

export interface Category {
  id: string;
  label: string;
  color: string;
}

export interface GraphNode {
  id: string;
  title: string;
  category: string;
  color: string;
  val: number;
  phantom?: boolean;
  publishedAt?: string;
  updatedAt?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  reason: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
