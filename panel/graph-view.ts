import { DataSet, Network, type Edge as VisEdge, type Node as VisNode } from "vis-network/standalone";
import { mountBanner, mountButton, mountEmpty, mountSearchField, mountSpinner, type SearchFieldHandle } from "@openchamber/sdk/ui";
import type { MemoryApi } from "./api";
import { openDialog, type DialogHandle } from "./dialog";
import { buildDetailContent } from "./detail";
import { buildGraphModel, filterGraph, type GraphFilter, type GraphModel, type GraphTheme } from "./graph-model";
import type { Messages } from "./i18n";
import type { AppState } from "./state";

export type GraphViewDeps = {
  api: MemoryApi;
  strings: (locale: string) => Messages;
};

export type GraphViewHandle = {
  update(state: AppState): void;
  dispose(): void;
};

const GRAPH_PAGE_SIZE = 2000;
const STALE_MS = 30_000;
const REVEAL_FALLBACK_MS = 20_000;
const STABILIZATION_ITERATIONS = 300;

function readTheme(): GraphTheme {
  const styles = getComputedStyle(document.documentElement);
  const value = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  const mode = document.documentElement.dataset.ocTheme === "dark" ? "dark" : "light";
  return {
    mode,
    memory: value("--oc-primary", "#2563eb"),
    prompt: value("--oc-warning", "#d97706"),
    edge: value("--oc-border", "#a3a3a3"),
    text: value("--oc-fg", "#171717"),
  };
}

export function mountGraphView(root: Element, deps: GraphViewDeps): GraphViewHandle {
  let latest: AppState | undefined;
  let status: "idle" | "loading" | "ready" | "error" = "idle";
  let fullModel: GraphModel | null = null;
  let fetchedAt = 0;
  let filter: GraphFilter = { kind: "all" };
  let searchDraft = "";
  let network: Network | null = null;
  let nodeData: DataSet<VisNode> | null = null;
  let edgeData: DataSet<VisEdge> | null = null;
  let revealTimer: ReturnType<typeof setTimeout> | null = null;
  let themeKey = "";
  let detailDialog: DialogHandle | null = null;
  let revealed = false;

  const text = (): Messages => deps.strings(latest?.locale ?? "en");

  const toolbar = document.createElement("div");
  toolbar.className = "memory-graph__toolbar";
  const chips = document.createElement("div");
  chips.className = "memory-graph__chips";
  const searchRoot = document.createElement("div");
  searchRoot.className = "memory-graph__search";
  const tools = document.createElement("div");
  tools.className = "memory-graph__tools";
  toolbar.append(chips, searchRoot, tools);

  const guidanceRoot = document.createElement("div");
  const feedbackRoot = document.createElement("div");
  feedbackRoot.className = "memory-graph__feedback";
  const spinnerRoot = document.createElement("div");
  const errorRoot = document.createElement("div");
  const emptyRoot = document.createElement("div");
  feedbackRoot.append(spinnerRoot, errorRoot, emptyRoot);
  const canvasHost = document.createElement("div");
  canvasHost.className = "memory-graph__canvas";
  root.append(toolbar, guidanceRoot, feedbackRoot, canvasHost);

  const chipAll = mountButton(chips, { label: "", size: "sm", onClick: () => setKind("all") });
  const chipMemory = mountButton(chips, { label: "", size: "sm", onClick: () => setKind("memory") });
  const chipPrompt = mountButton(chips, { label: "", size: "sm", onClick: () => setKind("prompt") });
  const search: SearchFieldHandle = mountSearchField(searchRoot, {
    value: "",
    placeholder: "",
    label: "",
    onChange: (value) => {
      searchDraft = value;
    },
  });
  const zoomIn = mountButton(tools, {
    label: "",
    variant: "ghost",
    size: "sm",
    onClick: () => {
      if (network) network.moveTo({ scale: Math.min(network.getScale() * 1.2, 3) });
    },
  });
  const zoomOut = mountButton(tools, {
    label: "",
    variant: "ghost",
    size: "sm",
    onClick: () => {
      if (network) network.moveTo({ scale: Math.max(network.getScale() * 0.8, 0.05) });
    },
  });
  const fit = mountButton(tools, { label: "", variant: "ghost", size: "sm", onClick: () => network?.fit() });
  const guidance = mountBanner(guidanceRoot, { tone: "info", title: "", body: "" });
  const spinner = mountSpinner(spinnerRoot, { label: "" });
  const errorBanner = mountBanner(errorRoot, { tone: "error", title: "", body: "", action: { label: "", onClick: () => void fetchGraph(true) } });
  const empty = mountEmpty(emptyRoot, { title: "", body: "" });

  searchRoot.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      filter = { ...filter, query: searchDraft };
      applyFilter();
    }
  });
  searchRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".oc-sdk-search-clear")) {
      filter = { ...filter, query: "" };
      applyFilter();
    }
  });

  function setKind(kind: GraphFilter["kind"]): void {
    filter = { ...filter, kind };
    applyFilter();
    paintChips();
  }

  function paintChips(): void {
    chipAll.update({ variant: filter.kind === "all" ? "default" : "outline" });
    chipMemory.update({ variant: filter.kind === "memory" ? "default" : "outline" });
    chipPrompt.update({ variant: filter.kind === "prompt" ? "default" : "outline" });
  }

  function clearRevealTimer(): void {
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
  }

  function destroyNetwork(): void {
    clearRevealTimer();
    network?.destroy();
    network = null;
    nodeData = null;
    edgeData = null;
    revealed = false;
    canvasHost.classList.remove("is-ready");
  }

  function freezeAndReveal(): void {
    clearRevealTimer();
    if (!network || revealed) return;
    revealed = true;
    network.setOptions({ physics: { enabled: false } });
    canvasHost.classList.add("is-ready");
  }

  function createNetwork(): void {
    destroyNetwork();
    if (!fullModel || fullModel.nodes.length === 0) return;
    const theme = readTheme();
    themeKey = theme.mode;

    const visNodes: VisNode[] = fullModel.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      color: { ...node.color, background: node.kind === "memory" ? theme.memory : theme.prompt, border: node.kind === "memory" ? theme.memory : theme.prompt, font: theme.text },
    }));
    const visEdges: VisEdge[] = fullModel.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      color: { color: theme.edge, highlight: theme.edge, inherit: false },
    }));
    nodeData = new DataSet(visNodes);
    edgeData = new DataSet(visEdges);
    network = new Network(canvasHost, { nodes: nodeData, edges: edgeData }, {
      layout: { randomSeed: 42 },
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 120,
          springConstant: 0.08,
          damping: 0.4,
          avoidOverlap: 0.2,
        },
        maxVelocity: 30,
        stabilization: { enabled: true, iterations: STABILIZATION_ITERATIONS, updateInterval: 25, fit: true },
      },
      nodes: { shape: "dot", size: 14, font: { size: 12, color: theme.text } },
      edges: { width: 1, smooth: false },
      interaction: { hover: true, tooltipDelay: 120 },
    });
    network.once("stabilizationIterationsDone", freezeAndReveal);
    revealTimer = setTimeout(freezeAndReveal, REVEAL_FALLBACK_MS);
    network.on("click", (params) => {
      if (params.nodes.length) openNodeDetail(String(params.nodes[0]));
    });
    applyFilter();
  }

  function applyFilter(): void {
    if (!fullModel || !nodeData || !edgeData) return;
    const visible = filterGraph(fullModel, filter);
    const visibleIds = new Set(visible.nodes.map((node) => node.id));
    const visibleEdges = new Set(visible.edges.map((edge) => edge.id));
    nodeData.update(fullModel.nodes.map((node) => ({ id: node.id, hidden: !visibleIds.has(node.id) })));
    edgeData.update(fullModel.edges.map((edge) => ({ id: edge.id, hidden: !visibleEdges.has(edge.id) })));
  }

  function recolor(): void {
    if (!fullModel || !nodeData || !edgeData || !network) return;
    const theme = readTheme();
    themeKey = theme.mode;
    nodeData.update(
      fullModel.nodes.map((node) => ({
        id: node.id,
        color: {
          background: node.kind === "memory" ? theme.memory : theme.prompt,
          border: node.kind === "memory" ? theme.memory : theme.prompt,
          font: theme.text,
        },
      })),
    );
    edgeData.update(fullModel.edges.map((edge) => ({ id: edge.id, color: { color: theme.edge, highlight: theme.edge, inherit: false } })));
    network.setOptions({ nodes: { font: { size: 12, color: theme.text } } });
  }

  function neighborsOf(nodeId: string): GraphModel["nodes"] {
    if (!fullModel) return [];
    const neighborIds = new Set<string>();
    for (const edge of fullModel.edges) {
      if (edge.from === nodeId) neighborIds.add(edge.to);
      if (edge.to === nodeId) neighborIds.add(edge.from);
    }
    return fullModel.nodes.filter((node) => neighborIds.has(node.id));
  }

  function openNodeDetail(nodeId: string): void {
    const node = fullModel?.nodes.find((entry) => entry.id === nodeId);
    if (!node) return;
    const t = text();
    const content = buildDetailContent(node.item, t, latest?.locale ?? "en");
    const neighbors = neighborsOf(nodeId);
    if (neighbors.length) {
      const section = document.createElement("section");
      section.className = "memory-graph__related";
      const heading = document.createElement("h3");
      heading.textContent = t.relatedLabel;
      const list = document.createElement("div");
      list.className = "memory-graph__related-list";
      for (const neighbor of neighbors) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "memory-graph__related-button";
        button.textContent = neighbor.label;
        button.addEventListener("click", () => {
          network?.selectNodes([neighbor.id]);
          network?.focus(neighbor.id, { scale: 1.1 });
          openNodeDetail(neighbor.id);
        });
        list.append(button);
      }
      section.append(heading, list);
      content.append(section);
    }
    detailDialog = openDialog({
      title: t.details,
      content,
      closeLabel: t.close,
      kind: "drawer",
      onClose: () => {
        detailDialog = null;
      },
    });
  }

  async function fetchGraph(force: boolean): Promise<void> {
    if (status === "loading") return;
    if (!force && fullModel && Date.now() - fetchedAt < STALE_MS) return;
    status = "loading";
    paint();
    try {
      const page = await deps.api.getMemories({ page: 1, pageSize: GRAPH_PAGE_SIZE, includePrompts: true });
      fullModel = buildGraphModel(page.items, readTheme());
      fetchedAt = Date.now();
      status = "ready";
      createNetwork();
    } catch {
      status = "error";
    }
    paint();
  }

  function paint(): void {
    const t = text();
    chipAll.update({ label: t.graphAll });
    chipMemory.update({ label: t.graphMemory });
    chipPrompt.update({ label: t.graphPrompt });
    search.update({ value: searchDraft, placeholder: t.searchPlaceholder, label: t.searchLabel });
    zoomIn.update({ label: t.zoomIn });
    zoomOut.update({ label: t.zoomOut });
    fit.update({ label: t.fitGraph });
    guidance.update({ title: t.graphFullPageTitle, body: t.graphFullPageBody });
    guidanceRoot.hidden = latest?.surface !== "panel";
    spinner.update({ label: t.loading, size: "sm" });
    if (status === "error") {
      errorBanner.update({ title: t.failedTitle, body: t.failedBody, action: { label: t.retry, onClick: () => void fetchGraph(true) } });
    }
    empty.update({ title: t.graphEmptyTitle, body: t.graphEmptyBody });
    const hasNodes = status === "ready" && Boolean(fullModel && fullModel.nodes.length > 0);
    const hasItems = Boolean(fullModel && fullModel.nodes.length > 0);
    canvasHost.hidden = !hasNodes;
    feedbackRoot.hidden = hasNodes;
    spinnerRoot.hidden = status !== "loading";
    errorRoot.hidden = status !== "error";
    emptyRoot.hidden = !(status === "ready" && !hasItems);
    paintChips();
  }

  function update(state: AppState): void {
    latest = state;
    if (state.activeView !== "graph") return;
    const nextThemeKey = document.documentElement.dataset.ocTheme ?? "";
    if (network && fullModel && nextThemeKey && nextThemeKey !== themeKey) {
      recolor();
    }
    paint();
    if (status === "idle" || status === "ready") void fetchGraph(false);
  }

  function dispose(): void {
    detailDialog?.close();
    destroyNetwork();
    chipAll.dispose();
    chipMemory.dispose();
    chipPrompt.dispose();
    search.dispose();
    zoomIn.dispose();
    zoomOut.dispose();
    fit.dispose();
    guidance.dispose();
    spinner.dispose();
    errorBanner.dispose();
    empty.dispose();
    root.replaceChildren();
  }

  return { update, dispose };
}
