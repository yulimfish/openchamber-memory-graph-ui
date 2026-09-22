import type { MemoryPage } from "./types";

export type AppView = "list" | "graph" | "profile";
export type AppSurface = "panel" | "page";

export type AppState = {
  activeView: AppView;
  surface: AppSurface;
  locale: string;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  query: string;
  selectedTag: string | null;
  selectedIds: string[];
  selectedMemoryId: string | null;
  memoryPage: MemoryPage;
  requestGeneration: number;
};

export const initialState: AppState = {
  activeView: "list",
  surface: "panel",
  locale: "en",
  loading: false,
  error: null,
  page: 1,
  pageSize: 20,
  total: 0,
  query: "",
  selectedTag: null,
  selectedIds: [],
  selectedMemoryId: null,
  memoryPage: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
  requestGeneration: 0,
};

export type AppAction =
  | { type: "HOST_READY"; surface: AppSurface; locale: string }
  | { type: "VIEW_CHANGED"; view: AppView }
  | { type: "QUERY_CHANGED"; query: string }
  | { type: "TAG_CHANGED"; tag: string | null }
  | { type: "PAGE_CHANGED"; page: number }
  | { type: "PAGE_SIZE_CHANGED"; pageSize: number }
  | { type: "MEMORY_SELECTED"; id: string | null }
  | { type: "SELECTION_TOGGLED"; id: string }
  | { type: "REQUEST_STARTED" }
  | { type: "REQUEST_FAILED"; generation: number; message: string }
  | { type: "MEMORIES_RECEIVED"; generation: number; page: MemoryPage };

function resetPage(state: AppState, update: Pick<AppState, "query" | "selectedTag" | "pageSize">): AppState {
  return { ...state, ...update, page: 1 };
}

export function reduce(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "HOST_READY":
      return { ...state, surface: action.surface, locale: action.locale };
    case "VIEW_CHANGED":
      return { ...state, activeView: action.view };
    case "QUERY_CHANGED":
      return resetPage(state, { query: action.query, selectedTag: state.selectedTag, pageSize: state.pageSize });
    case "TAG_CHANGED":
      return resetPage(state, { query: state.query, selectedTag: action.tag, pageSize: state.pageSize });
    case "PAGE_CHANGED":
      return { ...state, page: Math.max(1, action.page) };
    case "PAGE_SIZE_CHANGED":
      return resetPage(state, {
        query: state.query,
        selectedTag: state.selectedTag,
        pageSize: Number.isSafeInteger(action.pageSize) && action.pageSize > 0
          ? action.pageSize
          : state.pageSize,
      });
    case "MEMORY_SELECTED":
      return { ...state, selectedMemoryId: action.id };
    case "SELECTION_TOGGLED":
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      };
    case "REQUEST_STARTED":
      return { ...state, loading: true, error: null, requestGeneration: state.requestGeneration + 1 };
    case "REQUEST_FAILED":
      return action.generation === state.requestGeneration
        ? { ...state, loading: false, error: action.message }
        : state;
    case "MEMORIES_RECEIVED": {
      if (action.generation !== state.requestGeneration) {
        return state;
      }
      const ids = new Set(action.page.items.map((item) => item.id));
      return {
        ...state,
        loading: false,
        error: null,
        page: action.page.page,
        pageSize: action.page.pageSize,
        total: action.page.total,
        memoryPage: action.page,
        selectedIds: state.selectedIds.filter((id) => ids.has(id)),
        selectedMemoryId: state.selectedMemoryId && ids.has(state.selectedMemoryId)
          ? state.selectedMemoryId
          : null,
      };
    }
  }
}
