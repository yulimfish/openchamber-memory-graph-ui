import type { MemoryItem, PromptItem } from "./types";

export type GraphTheme = {
  mode: "light" | "dark";
  memory: string;
  prompt: string;
  edge: string;
  text: string;
};

export type GraphNode = {
  id: string;
  label: string;
  kind: "memory" | "prompt";
  item: MemoryItem | PromptItem;
  color: { background: string; border: string; font: string };
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  kind: "link" | "shared-tag";
  color: { color: string; highlight: string };
};

export type GraphModel = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  typeCounts: { memory: number; prompt: number };
};

export type GraphFilter = {
  kind: "all" | "memory" | "prompt";
  query?: string;
};

const LABEL_LIMIT = 48;

function shortLabel(content: string): string {
  const compact = content.replace(/\s+/g, " ").trim();
  if (!compact) return "…";
  return compact.length > LABEL_LIMIT ? `${compact.slice(0, LABEL_LIMIT)}…` : compact;
}

function nodeId(item: MemoryItem | PromptItem): string {
  return `${item.type}:${item.id}`;
}

function pairKey(from: string, to: string): string {
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

export function buildGraphModel(items: Array<MemoryItem | PromptItem>, theme: GraphTheme): GraphModel {
  const ordered = [...items].sort((a, b) => nodeId(a).localeCompare(nodeId(b)));
  const known = new Set(ordered.map((item) => nodeId(item)));

  const nodes: GraphNode[] = ordered.map((item) => {
    const kind = item.type;
    const color = kind === "memory" ? theme.memory : theme.prompt;
    return {
      id: nodeId(item),
      label: shortLabel(item.content),
      kind,
      item,
      color: { background: color, border: color, font: theme.text },
    };
  });

  const edges: GraphEdge[] = [];
  const seenPairs = new Set<string>();
  const addEdge = (from: string, to: string, kind: GraphEdge["kind"]): void => {
    if (from === to) return;
    const key = pairKey(from, to);
    if (seenPairs.has(key)) return;
    seenPairs.add(key);
    edges.push({ id: `${from}->${to}`, from, to, kind, color: { color: theme.edge, highlight: theme.edge } });
  };

  for (const item of ordered) {
    if (item.type === "memory" && item.linkedPromptId) {
      const target = `prompt:${item.linkedPromptId}`;
      if (known.has(target)) addEdge(nodeId(item), target, "link");
    } else if (item.type === "prompt" && item.linkedMemoryId) {
      const target = `memory:${item.linkedMemoryId}`;
      if (known.has(target)) addEdge(nodeId(item), target, "link");
    }
  }

  const byTag = new Map<string, string[]>();
  for (const item of ordered) {
    if (item.type !== "memory") continue;
    for (const tag of item.tags ?? []) {
      const members = byTag.get(tag) ?? [];
      members.push(nodeId(item));
      byTag.set(tag, members);
    }
  }
  for (const tag of [...byTag.keys()].sort()) {
    const members = [...(byTag.get(tag) ?? [])].sort();
    if (members.length < 2 || members.length > 8) continue;
    for (let index = 1; index < members.length; index += 1) {
      addEdge(members[index - 1], members[index], "shared-tag");
    }
  }

  const typeCounts = {
    memory: nodes.filter((node) => node.kind === "memory").length,
    prompt: nodes.filter((node) => node.kind === "prompt").length,
  };

  return { nodes, edges, typeCounts };
}

export function filterGraph(model: GraphModel, filter: GraphFilter): GraphModel {
  const query = filter.query?.trim().toLowerCase();
  const nodes = model.nodes.filter((node) => {
    if (filter.kind !== "all" && node.kind !== filter.kind) return false;
    if (query && !node.item.content.toLowerCase().includes(query)) return false;
    return true;
  });
  const kept = new Set(nodes.map((node) => node.id));
  const edges = model.edges.filter((edge) => kept.has(edge.from) && kept.has(edge.to));
  const typeCounts = {
    memory: nodes.filter((node) => node.kind === "memory").length,
    prompt: nodes.filter((node) => node.kind === "prompt").length,
  };
  return { nodes, edges, typeCounts };
}
