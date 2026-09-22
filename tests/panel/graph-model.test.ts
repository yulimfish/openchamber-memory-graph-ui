import { expect, test } from "bun:test";
import { buildGraphModel, filterGraph, type GraphTheme } from "../../panel/graph-model";
import type { MemoryItem, PromptItem } from "../../panel/types";

const theme: GraphTheme = {
  mode: "light",
  memory: "#2563eb",
  prompt: "#d97706",
  edge: "#a3a3a3",
  text: "#171717",
};

function memory(id: string, overrides: Partial<MemoryItem> = {}): MemoryItem {
  return {
    type: "memory",
    id,
    content: `content ${id}`,
    createdAt: "2026-09-22T00:00:00.000Z",
    ...overrides,
  };
}

function prompt(id: string, overrides: Partial<PromptItem> = {}): PromptItem {
  return {
    type: "prompt",
    id,
    content: `prompt ${id}`,
    createdAt: "2026-09-22T00:00:00.000Z",
    ...overrides,
  };
}

test("builds deterministic nodes, safe labels, and type counts", () => {
  const items = [memory("m1", { content: "" }), prompt("p1")];

  const first = buildGraphModel(items, theme);
  const second = buildGraphModel([...items].reverse(), theme);

  expect(first.nodes.map((node) => node.id)).toEqual(["memory:m1", "prompt:p1"]);
  expect(first.typeCounts).toEqual({ memory: 1, prompt: 1 });
  expect(first).toEqual(second);

  const emptyNode = first.nodes.find((node) => node.id === "memory:m1");
  expect(emptyNode?.label.length ?? 0).toBeGreaterThan(0);
});

test("adds one link edge even when both sides reference each other", () => {
  const items = [memory("m1", { linkedPromptId: "p1" }), prompt("p1", { linkedMemoryId: "m1" })];

  const edges = buildGraphModel(items, theme).edges;

  expect(edges).toHaveLength(1);
  expect(edges[0]).toMatchObject({ kind: "link", from: "memory:m1", to: "prompt:p1" });
});

test("ignores links whose counterpart is missing", () => {
  const model = buildGraphModel([memory("m1", { linkedPromptId: "missing" })], theme);

  expect(model.edges).toHaveLength(0);
});

test("adds shared-tag edges only for tags with two through eight members", () => {
  const twoItems = [memory("a", { tags: ["shared"] }), memory("b", { tags: ["shared"] })];
  expect(buildGraphModel(twoItems, theme).edges.filter((edge) => edge.kind === "shared-tag")).toHaveLength(1);

  const nineItemsWithSameTag = Array.from({ length: 9 }, (_, index) =>
    memory(`n${index}`, { tags: ["shared"] }),
  );
  expect(buildGraphModel(nineItemsWithSameTag, theme).edges).toHaveLength(0);

  const oneItem = [memory("solo", { tags: ["shared"] })];
  expect(buildGraphModel(oneItem, theme).edges).toHaveLength(0);
});

test("filters by kind and query and drops edges with hidden endpoints", () => {
  const items = [
    memory("a", { content: "Alpha topic", tags: ["shared"] }),
    memory("b", { content: "Beta topic", tags: ["shared"] }),
    prompt("p1"),
  ];
  const model = buildGraphModel(items, theme);

  const promptsOnly = filterGraph(model, { kind: "prompt" });
  expect(promptsOnly.nodes.map((node) => node.id)).toEqual(["prompt:p1"]);
  expect(promptsOnly.edges).toHaveLength(0);

  const searched = filterGraph(model, { kind: "all", query: "alpha" });
  expect(searched.nodes.map((node) => node.id)).toEqual(["memory:a"]);
  expect(searched.edges).toHaveLength(0);

  const memoriesOnly = filterGraph(model, { kind: "memory" });
  expect(memoriesOnly.nodes.map((node) => node.id)).toEqual(["memory:a", "memory:b"]);
  expect(memoriesOnly.edges).toHaveLength(1);
  expect(memoriesOnly.typeCounts).toEqual({ memory: 2, prompt: 0 });
});
