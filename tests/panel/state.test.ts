import { expect, test } from "bun:test";
import { initialState, reduce } from "../../panel/state";
import { formatAlphaBeta, formatConfidence, groupProfileItems } from "../../panel/profile-view";
import type { MemoryPage } from "../../panel/types";

function page(ids: string[]): MemoryPage {
  return {
    items: ids.map((id) => ({ type: "memory", id, content: "Example", createdAt: "2026-09-22T00:00:00.000Z" })),
    total: ids.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };
}

test("resets pagination when search query or selected tag changes", () => {
  const pageThree = { ...initialState, page: 3 };

  expect(reduce(pageThree, { type: "QUERY_SUBMITTED", query: "memory" })).toMatchObject({
    query: "memory",
    queryDraft: "memory",
    page: 1,
  });
  expect(reduce(pageThree, { type: "TAG_CHANGED", tag: "project-example" })).toMatchObject({
    selectedTag: "project-example",
    page: 1,
  });
});

test("keeps draft query separate until submit", () => {
  const pageThree = { ...initialState, page: 3, query: "old" };

  const draft = reduce(pageThree, { type: "QUERY_DRAFT_CHANGED", query: "new" });
  expect(draft).toMatchObject({ queryDraft: "new", query: "old", page: 3 });

  expect(reduce(draft, { type: "QUERY_SUBMITTED", query: "new" })).toMatchObject({
    query: "new",
    queryDraft: "new",
    page: 1,
  });
});

test("keeps only selected memory ids that survive a refresh", () => {
  const state = {
    ...initialState,
    selectedIds: ["kept", "removed"],
    selectedMemoryId: "removed",
  };

  expect(
    reduce(state, {
      type: "MEMORIES_RECEIVED",
      generation: 0,
      page: page(["kept"]),
    }),
  ).toMatchObject({ selectedIds: ["kept"], selectedMemoryId: null, total: 1 });
});

test("ignores stale request results", () => {
  const requested = reduce(initialState, { type: "REQUEST_STARTED" });
  const newerRequest = reduce(requested, { type: "REQUEST_STARTED" });

  expect(
    reduce(newerRequest, {
      type: "MEMORIES_RECEIVED",
      generation: requested.requestGeneration,
      page: page(["stale"]),
    }),
  ).toEqual(newerRequest);
  expect(
    reduce(newerRequest, {
      type: "MEMORIES_RECEIVED",
      generation: newerRequest.requestGeneration,
      page: page(["current"]),
    }),
  ).toMatchObject({ loading: false, memoryPage: { items: [{ id: "current" }] } });

  expect(
    reduce(newerRequest, {
      type: "REQUEST_FAILED",
      generation: requested.requestGeneration,
      message: "Stale failure",
    }),
  ).toEqual(newerRequest);
});

test("keeps page size as a positive integer", () => {
  for (const pageSize of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(reduce(initialState, { type: "PAGE_SIZE_CHANGED", pageSize })).toMatchObject({
      page: 1,
      pageSize: initialState.pageSize,
    });
  }
  expect(reduce(initialState, { type: "PAGE_SIZE_CHANGED", pageSize: 50 })).toMatchObject({
    page: 1,
    pageSize: 50,
  });
});

test("groups profile items by category with fallback and descending size", () => {
  const items = [
    { category: "a", description: "first" },
    { category: "b", description: "second" },
    { category: "b", description: "third" },
    { description: "uncategorized" },
  ];

  const groups = groupProfileItems(items, "General");

  expect(groups.map((group) => group.label)).toEqual(["b", "a", "General"]);
  expect(groups.map((group) => group.items.length)).toEqual([2, 1, 1]);
  expect(groups.find((group) => group.label === "General")?.items.map((item) => item.description)).toEqual([
    "uncategorized",
  ]);
});

test("formats confidence and alpha/beta signal stats", () => {
  expect(formatConfidence(0.9)).toBe("90%");
  expect(formatConfidence(0.875)).toBe("88%");
  expect(formatConfidence(undefined)).toBeNull();
  expect(formatAlphaBeta(3, 1)).toBe("3/1");
  expect(formatAlphaBeta(undefined, 1)).toBeNull();
  expect(formatAlphaBeta(2, undefined)).toBeNull();
});

test("keeps workflow step order through grouping", () => {
  const workflows = [
    { category: "coding", description: "workflow one", steps: ["step 1", "step 2", "step 3"] },
    { description: "workflow two", steps: ["only step"] },
  ];

  const groups = groupProfileItems(workflows, "General");
  const flattened = groups.flatMap((group) => group.items);
  const ordered = flattened.find((item) => item.description === "workflow one");

  expect(ordered?.steps).toEqual(["step 1", "step 2", "step 3"]);
  expect(groups.find((group) => group.label === "General")?.items[0]?.steps).toEqual(["only step"]);
});
