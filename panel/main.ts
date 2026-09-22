import { connectHost } from "@openchamber/sdk";
import { applyHostReady, mountBanner, mountButton, mountEmpty, mountSpinner, mountTabs } from "@openchamber/sdk/ui";
import { createMemoryApi, MemoryApiError } from "./api";
import { resolveLocale, strings } from "./i18n";
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
const placeholder = document.createElement("div");
placeholder.className = "memory-app__placeholder";
content.append(feedback, placeholder);
root.append(header, tabsRoot, content);

const tabs = mountTabs(tabsRoot, {
  items: [],
  activeId: state.activeView,
  onChange: (id) => dispatch({ type: "VIEW_CHANGED", view: id as AppView }),
  trackBackground: true,
});
const refresh = mountButton(toolbar, { label: "", variant: "outline", size: "sm", onClick: () => void load() });
const empty = mountEmpty(placeholder, { title: "", body: "" });
const spinner = mountSpinner(spinnerRoot, { label: "" });
const banner = mountBanner(bannerRoot, {
  tone: "error",
  title: "",
  body: "",
  action: { label: "", onClick: () => void load() },
});

function surfaceFromHost(surface: string): AppSurface {
  return surface === "page" ? "page" : "panel";
}

function dispatch(action: AppAction): void {
  state = reduce(state, action);
  render();
}

async function load(): Promise<void> {
  if (state.loading) return;
  dispatch({ type: "REQUEST_STARTED" });
  const generation = state.requestGeneration;
  try {
    const page = await api.getMemories({
      page: state.page,
      pageSize: state.pageSize,
      includePrompts: true,
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
  placeholder.hidden = state.loading || Boolean(state.error);
  empty.update({ title: text.emptyTitle, body: text.emptyBody });
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

window.addEventListener(
  "unload",
  () => {
    stopReady();
    tabs.dispose();
    refresh.dispose();
    empty.dispose();
    spinner.dispose();
    banner.dispose();
    host.dispose();
  },
  { once: true },
);
