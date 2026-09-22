import { connectHost } from "@openchamber/sdk";
import { applyHostReady, mountBanner, mountButton, mountSpinner, mountTabs } from "@openchamber/sdk/ui";
import { createMemoryApi, MemoryApiError } from "./api";
import { mountGraphView } from "./graph-view";
import { resolveLocale, strings } from "./i18n";
import { mountMemoryView } from "./memory-view";
import { mountProfileView } from "./profile-view";
import { initialState, reduce, type AppAction, type AppSurface, type AppView } from "./state";

const host = connectHost();
const api = createMemoryApi(host);
let state = initialState;
let mounted = false;
let loadStarted = false;

const root = document.createElement("main");
root.className = "memory-app";
const header = document.createElement("header");
header.className = "memory-app__header";
const title = document.createElement("h1");
title.className = "memory-app__title";
const status = document.createElement("span");
status.className = "memory-app__status";
const statusDot = document.createElement("span");
statusDot.className = "memory-app__status-dot";
statusDot.setAttribute("aria-hidden", "true");
const statusText = document.createElement("span");
statusText.className = "memory-app__status-text";
status.append(statusDot, statusText);
const toolbar = document.createElement("div");
toolbar.className = "memory-app__toolbar";
header.append(title, status, toolbar);
const tabsRoot = document.createElement("nav");
tabsRoot.className = "memory-app__tabs";
const content = document.createElement("section");
content.className = "memory-app__content";
const feedback = document.createElement("div");
const spinnerRoot = document.createElement("div");
const bannerRoot = document.createElement("div");
feedback.append(spinnerRoot, bannerRoot);
const memoryRoot = document.createElement("div");
memoryRoot.className = "memory-list";
const graphRoot = document.createElement("div");
graphRoot.className = "memory-graph";
const profileRoot = document.createElement("div");
profileRoot.className = "profile";
content.append(feedback, memoryRoot, graphRoot, profileRoot);
root.append(header, tabsRoot, content);

const tabs = mountTabs(tabsRoot, {
  items: [],
  activeId: state.activeView,
  onChange: (id) => dispatch({ type: "VIEW_CHANGED", view: id as AppView }),
  trackBackground: true,
});
const refresh = mountButton(toolbar, { label: "", variant: "outline", size: "sm", onClick: () => void load() });
const spinner = mountSpinner(spinnerRoot, { label: "" });
const banner = mountBanner(bannerRoot, {
  tone: "error",
  title: "",
  body: "",
  action: { label: "", onClick: () => void load() },
});
const memoryView = mountMemoryView(memoryRoot, {
  api,
  dispatch,
  reload: load,
  strings,
  toast: (kind, message) => void host.toast({ kind, message }),
});
const graphView = mountGraphView(graphRoot, { api, strings });
const profileView = mountProfileView(profileRoot, {
  api,
  strings,
  toast: (kind, message) => void host.toast({ kind, message }),
});

function surfaceFromHost(surface: string): AppSurface {
  return surface === "page" ? "page" : "panel";
}

function dispatch(action: AppAction): void {
  state = reduce(state, action);
  render();
}

async function load(): Promise<void> {
  dispatch({ type: "REQUEST_STARTED" });
  const generation = state.requestGeneration;
  try {
    const page = state.query
      ? await api.searchMemories({
          query: state.query,
          page: state.page,
          pageSize: state.pageSize,
          tag: state.selectedTag ?? undefined,
        })
      : await api.getMemories({
          page: state.page,
          pageSize: state.pageSize,
          includePrompts: true,
          tag: state.selectedTag ?? undefined,
        });
    dispatch({ type: "MEMORIES_RECEIVED", generation, page });
  } catch (error) {
    const code = error instanceof MemoryApiError ? error.code : "SERVICE_FAILED";
    dispatch({ type: "REQUEST_FAILED", generation, message: code });
  }
}

function errorCopy(error: string, locale: string) {
  const text = strings(locale);
  switch (error) {
    case "NO_SERVICE":
    case "NOT_GRANTED":
      return { title: text.serviceNotApprovedTitle, body: text.serviceNotApprovedBody };
    case "UPSTREAM_UNAUTHORIZED":
      return { title: text.unauthorizedTitle, body: text.unauthorizedBody };
    case "UPSTREAM_UNAVAILABLE":
      return { title: text.unavailableTitle, body: text.unavailableBody };
    default:
      return { title: text.failedTitle, body: text.failedBody };
  }
}

function render(): void {
  const text = strings(state.locale);
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";
  root.dataset.surface = state.surface;
  title.textContent = text.memory;
  tabsRoot.setAttribute("aria-label", text.viewsLabel);
  const statusLabel = state.error ? text.failedTitle : state.loading ? text.loading : text.ready;
  statusText.textContent = statusLabel;
  status.setAttribute("aria-label", statusLabel);
  refresh.update({ label: text.refresh, loading: state.loading });
  tabs.update({
    activeId: state.activeView,
    items: [
      { id: "list", label: text.list },
      { id: "graph", label: text.graph },
      { id: "profile", label: text.profile },
    ],
  });
  if (state.error) {
    const copy = errorCopy(state.error, state.locale);
    banner.update({ title: copy.title, body: copy.body, action: { label: text.retry, onClick: () => void load() } });
  }
  spinnerRoot.hidden = !state.loading;
  bannerRoot.hidden = !state.error;
  if (state.loading) {
    spinner.update({ label: text.loading, size: "sm" });
  }
  feedback.hidden = !state.loading && !state.error;
  memoryRoot.hidden = state.activeView !== "list";
  graphRoot.hidden = state.activeView !== "graph";
  profileRoot.hidden = state.activeView !== "profile";
  memoryView.update(state);
  graphView.update(state);
  profileView.update(state);
}

function mount(): void {
  if (mounted) return;
  mounted = true;
  document.body.replaceChildren(root);
}

const stopReady = host.onReady((context) => {
  applyHostReady(context, document.documentElement);
  mount();
  dispatch({ type: "HOST_READY", surface: surfaceFromHost(context.surface), locale: resolveLocale(context.locale) });
  if (!loadStarted) {
    loadStarted = true;
    void load();
  }
});

const pollTimer = setInterval(() => {
  if (document.visibilityState === "visible" && state.activeView === "list" && !state.loading) {
    void load();
  }
}, 30_000);

window.addEventListener(
  "unload",
  () => {
    clearInterval(pollTimer);
    stopReady();
    tabs.dispose();
    refresh.dispose();
    spinner.dispose();
    banner.dispose();
    memoryView.dispose();
    graphView.dispose();
    profileView.dispose();
    host.dispose();
  },
  { once: true },
);
