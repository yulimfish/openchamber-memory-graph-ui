import { expect, test } from "bun:test";
import { initialState, reduce } from "../../panel/state";
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

  expect(reduce(pageThree, { type: "QUERY_CHANGED", query: "memory" })).toMatchObject({
    query: "memory",
    page: 1,
  });
  expect(reduce(pageThree, { type: "TAG_CHANGED", tag: "project-example" })).toMatchObject({
    selectedTag: "project-example",
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
