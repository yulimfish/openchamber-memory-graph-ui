import { expect, test } from "bun:test";
import { formatDate } from "../../panel/detail";
import { formatAlphaBeta, formatConfidence, formatCount } from "../../panel/profile-view";
import { openDialog } from "../../panel/dialog";
import { mountMemoryView } from "../../panel/memory-view";
import { strings } from "../../panel/i18n";
import { initialState, reduce } from "../../panel/state";
import type { AppState } from "../../panel/state";
import type { MemoryItem, MemoryPage } from "../../panel/types";

class ShimText {
  parentNode: ShimElement | null = null;
  constructor(public textContent: string) {}
}

class ShimElement {
  readonly children: Array<ShimElement | ShimText> = [];
  readonly attributes = new Map<string, string>();
  readonly dataset: Record<string, string> = {};
  readonly listeners = new Map<string, Array<(event: any) => void>>();
  readonly style: Record<string, string> = {};
  readonly classList = {
    add: (name: string) => { this.className = [...new Set([...this.className.split(" ").filter(Boolean), name])].join(" "); },
    remove: (name: string) => { this.className = this.className.split(" ").filter((part) => part !== name).join(" "); },
    contains: (name: string) => this.className.split(" ").includes(name),
  };
  parentNode: ShimElement | null = null;
  className = "";
  value = "";
  type = "";
  id = "";
  tabIndex = 0;
  disabled = false;
  hidden = false;
  spellcheck = true;
  autocomplete = "";
  rows = 0;
  private ownText = "";

  constructor(readonly tagName: string) {}
  get firstChild(): ShimElement | ShimText | null { return this.children[0] ?? null; }
  get textContent(): string { return this.ownText + this.children.map((child) => child.textContent).join(""); }
  set textContent(value: string) { this.replaceChildren(); this.ownText = value; }
  get parentElement(): ShimElement | null { return this.parentNode; }
  append(...nodes: Array<ShimElement | ShimText>): void {
    this.ownText = "";
    for (const node of nodes) {
      node.parentNode?.removeChild(node);
      node.parentNode = this;
      this.children.push(node);
    }
  }
  prepend(...nodes: Array<ShimElement | ShimText>): void { this.children.unshift(...nodes); for (const n of nodes) n.parentNode = this; }
  appendChild(node: ShimElement | ShimText): ShimElement | ShimText { this.append(node); return node; }
  removeChild(node: ShimElement | ShimText): ShimElement | ShimText {
    const index = this.children.indexOf(node);
    if (index >= 0) this.children.splice(index, 1);
    node.parentNode = null;
    return node;
  }
  replaceChild(next: ShimElement | ShimText, old: ShimElement | ShimText): ShimElement | ShimText {
    const index = this.children.indexOf(old);
    if (index >= 0) {
      next.parentNode?.removeChild(next);
      this.children[index] = next;
      next.parentNode = this;
      old.parentNode = null;
    }
    return old;
  }
  replaceChildren(...nodes: Array<ShimElement | ShimText>): void {
    for (const child of this.children) child.parentNode = null;
    this.children.length = 0;
    this.ownText = "";
    this.append(...nodes);
  }
  remove(): void { this.parentNode?.removeChild(this); }
  contains(node: unknown): boolean {
    return node === this || this.children.some((child) => child === node || (child instanceof ShimElement && child.contains(node)));
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === "class") this.className = value;
    if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
  }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string): void { this.attributes.delete(name); }
  addEventListener(type: string, listener: (event: any) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, listener: (event: any) => void): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== listener));
  }
  dispatch(type: string, init: Record<string, unknown> = {}): void {
    const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...init };
    let current: ShimElement | null = this;
    while (current) {
      for (const listener of current.listeners.get(type) ?? []) listener(event);
      current = current.parentNode;
    }
  }
  focus(): void { (globalThis as any).document.activeElement = this; }
  closest(selector: string): ShimElement | null {
    let current: ShimElement | null = this;
    while (current) { if (current.matches(selector)) return current; current = current.parentNode; }
    return null;
  }
  matches(selector: string): boolean {
    if (selector === "[data-action]") return Boolean(this.dataset.action);
    if (selector === "[data-focus-key]") return Boolean(this.dataset.focusKey);
    if (selector === '[role="alert"]' || selector === "[role=alert]") return this.getAttribute("role") === "alert";
    if (selector === 'input[data-select]') return this.tagName === "input" && Boolean(this.dataset.select);
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    return this.tagName === selector.toLowerCase();
  }
  querySelectorAll<T extends ShimElement = ShimElement>(selector: string): T[] {
    const matches: ShimElement[] = [];
    const visit = (node: ShimElement) => { for (const child of node.children) if (child instanceof ShimElement) { if (child.matches(selector)) matches.push(child); visit(child); } };
    visit(this);
    return matches as T[];
  }
  querySelector<T extends ShimElement = ShimElement>(selector: string): T | null { return this.querySelectorAll<T>(selector)[0] ?? null; }
}

function installDomShim(): () => void {
  const saved = ["document", "Node", "Element", "HTMLElement", "HTMLInputElement", "HTMLStyleElement"]
    .map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const body = new ShimElement("body");
  class ShimStyle extends ShimElement {}
  const style = new ShimStyle("style");
  const documentShim = {
    body,
    head: new ShimElement("head"),
    activeElement: null as ShimElement | null,
    createElement: (tag: string) => tag === "style" ? new ShimStyle(tag) : new ShimElement(tag),
    createElementNS: (_namespace: string, tag: string) => new ShimElement(tag),
    createTextNode: (text: string) => new ShimText(text),
    getElementById: () => style as ShimElement,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  Object.assign(globalThis, {
    document: documentShim,
    Node: ShimElement,
    Element: ShimElement,
    HTMLElement: ShimElement,
    HTMLInputElement: ShimElement,
    HTMLStyleElement: ShimStyle,
  });
  return () => {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as any)[key];
    }
  };
}

test("repeated ready snapshots update locale without resetting active application state", () => {
  const existing = {
    ...initialState,
    locale: "en",
    activeView: "graph" as const,
    queryDraft: "unsaved search",
    selectedIds: ["memory-1"],
    selectedMemoryId: "memory-1",
    requestGeneration: 4,
  };
  const updated = reduce(existing, { type: "HOST_READY", surface: "panel", locale: "zh" });
  expect(updated.locale).toBe("zh");
  expect(updated.activeView).toBe("graph");
  expect(updated.queryDraft).toBe("unsaved search");
  expect(updated.selectedIds).toEqual(["memory-1"]);
  expect(updated.selectedMemoryId).toBe("memory-1");
  expect(updated.requestGeneration).toBe(4);
});

test("formats dates by supported locale and preserves invalid or missing values", () => {
  const value = "2025-01-02T03:04:00.000Z";
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
  expect(formatDate(value, "zh")).toBe(new Intl.DateTimeFormat("zh-CN", options).format(new Date(value)));
  expect(formatDate(value, "en")).toBe(new Intl.DateTimeFormat("en-US", options).format(new Date(value)));
  expect(formatDate("not-a-date", "zh")).toBe("not-a-date");
  expect(formatDate("", "en")).toBe("");
});

test("formats confidence and zero with locale-aware numerals", () => {
  expect(formatConfidence(0, "en")).toBe(new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 }).format(0));
  expect(formatConfidence(0.875, "zh")).toBe(new Intl.NumberFormat("zh-CN", { style: "percent", maximumFractionDigits: 0 }).format(0.875));
  expect(formatCount(1_234_567, "en")).toBe(new Intl.NumberFormat("en-US").format(1_234_567));
  expect(formatCount(1_234_567, "zh")).toBe(new Intl.NumberFormat("zh-CN").format(1_234_567));
  expect(formatCount(0, "en")).toBe("0");
  expect(formatCount(undefined, "en")).toBeNull();
  expect(formatAlphaBeta(1_234, 0, "en")).toBe(`${new Intl.NumberFormat("en-US").format(1_234)}/0`);
  expect(formatConfidence(Number.NaN, "en")).toBeNull();
});

test("keeps a validated active form's nodes, values, focus, and translated copy on HOST_READY", async () => {
  const restoreDom = installDomShim();
  const documentShim = (globalThis as any).document as { body: ShimElement; activeElement: ShimElement | null };
  const root = new ShimElement("main");
  const view = mountMemoryView(root as unknown as Element, {
    api: { async getTags() { return { project: [] }; } } as never,
    dispatch: () => {},
    reload: async () => {},
    strings,
    toast: () => {},
  });
  try {
    let state: AppState = { ...initialState, locale: "en" };
    view.update(state);
    await Promise.resolve();
    const addButton = root.querySelectorAll("button").find((button) => button.textContent === strings("en").addMemory)!;
    addButton.dispatch("click");
    const overlay = documentShim.body.querySelector(".memory-overlay")!;
    const containerInput = overlay.querySelectorAll("input")[0];
    const tagsInput = overlay.querySelectorAll("input")[1];
    const contentInput = overlay.querySelector("textarea")!;
    containerInput.value = "";
    tagsInput.value = "work";
    contentInput.value = "unsaved content";
    const saveButton = overlay.querySelectorAll("button").find((button) => button.textContent === strings("en").save)!;
    saveButton.dispatch("click");
    expect(documentShim.activeElement).toBe(containerInput);
    expect(overlay.querySelector("[role=alert]")?.textContent).toBe(strings("en").validationTag);

    containerInput.value = "project-example";
    state = reduce(state, { type: "HOST_READY", surface: "panel", locale: "zh" });
    view.update(state);

    expect(overlay.querySelectorAll("input")[0]).toBe(containerInput);
    expect(overlay.querySelectorAll("input")[1]).toBe(tagsInput);
    expect(overlay.querySelector("textarea")).toBe(contentInput);
    expect(containerInput.value).toBe("project-example");
    expect(tagsInput.value).toBe("work");
    expect(contentInput.value).toBe("unsaved content");
    expect(documentShim.activeElement).toBe(containerInput);
    expect(overlay.querySelector("[role=alert]")?.textContent).toBe(strings("zh").validationTag);
    expect(overlay.querySelector("label")?.firstChild?.textContent).toBe(strings("zh").formContainerTag);
  } finally {
    view.dispose();
    documentShim.body.querySelector(".memory-dialog__close")?.dispatch("click");
    restoreDom();
  }
});

test("updates a live delete confirmation without invoking its destructive action", () => {
  const restoreDom = installDomShim();
  const documentShim = (globalThis as any).document as { body: ShimElement };
  const root = new ShimElement("main");
  let deletes = 0;
  const item: MemoryItem = { type: "memory", id: "memory-1", content: "keep this content", createdAt: "2025-01-02T03:04:00.000Z" };
  const view = mountMemoryView(root as unknown as Element, {
    api: { async getTags() { return { project: [] }; }, async deleteMemory() { deletes += 1; } } as never,
    dispatch: () => {},
    reload: async () => {},
    strings,
    toast: () => {},
  });
  try {
    let state: AppState = {
      ...initialState,
      locale: "en",
      memoryPage: { items: [item], total: 1, page: 1, pageSize: 20, totalPages: 1 } as MemoryPage,
    };
    view.update(state);
    root.querySelectorAll("[data-action]").find((button) => button.dataset.action === "delete")!.dispatch("click");
    const dialog = documentShim.body.querySelector(".memory-dialog")!;
    state = reduce(state, { type: "HOST_READY", surface: "panel", locale: "zh" });
    view.update(state);

    expect(dialog.querySelector("h2")?.textContent).toBe(strings("zh").confirmDeleteTitle);
    expect(dialog.querySelector(".memory-confirm__message")?.textContent).toBe(strings("zh").confirmDeleteBody);
    expect(Boolean(dialog.querySelectorAll("button").find((button) => button.textContent === strings("zh").confirmButton))).toBe(true);
    expect(Boolean(dialog.querySelectorAll("button").find((button) => button.textContent === strings("zh").cancelButton))).toBe(true);
    expect(dialog.querySelector(".memory-dialog__close")?.getAttribute("aria-label")).toBe(strings("zh").close);
    expect(deletes).toBe(0);
  } finally {
    view.dispose();
    documentShim.body.querySelector(".memory-dialog__close")?.dispatch("click");
    restoreDom();
  }
});

test("updates list detail labels and date in place when locale changes", () => {
  const restoreDom = installDomShim();
  const documentShim = (globalThis as any).document as { body: ShimElement };
  const root = new ShimElement("main");
  const item: MemoryItem = { type: "memory", id: "memory-1", content: "user text", createdAt: "2025-01-02T03:04:00.000Z" };
  const view = mountMemoryView(root as unknown as Element, {
    api: { async getTags() { return { project: [] }; } } as never,
    dispatch: () => {},
    reload: async () => {},
    strings,
    toast: () => {},
  });
  try {
    const state = { ...initialState, locale: "en", selectedMemoryId: item.id, memoryPage: { items: [item], total: 1, page: 1, pageSize: 20, totalPages: 1 } };
    view.update(state);
    const dialog = documentShim.body.querySelector(".memory-dialog")!;
    view.update(reduce(state, { type: "HOST_READY", surface: "panel", locale: "zh" }));
    expect(dialog.querySelector("h2")?.textContent).toBe(strings("zh").details);
    expect(dialog.querySelector(".memory-dialog__close")?.getAttribute("aria-label")).toBe(strings("zh").close);
    expect(dialog.textContent.includes(strings("zh").metaCreated)).toBe(true);
    expect(dialog.textContent.includes(formatDate(item.createdAt, "zh"))).toBe(true);
    expect(dialog.textContent.includes(item.id)).toBe(true);
    expect(dialog.textContent.includes(item.content)).toBe(true);
  } finally {
    view.dispose();
    documentShim.body.querySelector(".memory-dialog__close")?.dispatch("click");
    restoreDom();
  }
});

test("restores a keyed focus target after replacing active detail content", () => {
  const restoreDom = installDomShim();
  const documentShim = (globalThis as any).document as { body: ShimElement; activeElement: ShimElement | null };
  try {
    const initial = new ShimElement("div");
    const link = new ShimElement("button");
    link.dataset.focusKey = "neighbor-1";
    initial.append(link);
    const handle = openDialog({ title: "Details", content: initial as unknown as Node, closeLabel: "Close" });
    link.focus();
    const updated = new ShimElement("div");
    const translatedLink = new ShimElement("button");
    translatedLink.dataset.focusKey = "neighbor-1";
    translatedLink.textContent = "邻居";
    updated.append(translatedLink);
    handle.update({ title: strings("zh").details, closeLabel: strings("zh").close, content: updated as unknown as Node });
    expect(documentShim.activeElement).toBe(translatedLink);
    const dialog = documentShim.body.querySelector(".memory-dialog")!;
    expect(dialog.querySelector("h2")?.textContent).toBe(strings("zh").details);
    expect(dialog.querySelector(".memory-dialog__close")?.getAttribute("aria-label")).toBe(strings("zh").close);
    expect(dialog.textContent.includes("邻居")).toBe(true);
    handle.close();
  } finally {
    restoreDom();
  }
});
