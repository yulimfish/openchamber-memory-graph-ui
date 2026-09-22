import type { Messages } from "./i18n";
import type { MemoryItem, PromptItem } from "./types";

export function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildDetailContent(
  item: MemoryItem | PromptItem,
  t: Messages,
  locale: string,
): HTMLElement {
  const content = document.createElement("div");
  content.className = "memory-detail";
  const pre = document.createElement("pre");
  pre.className = "memory-detail__content";
  pre.textContent = item.content;
  const meta = document.createElement("dl");
  meta.className = "memory-detail__meta";
  const addMeta = (label: string, value: string | null | undefined) => {
    if (!value) return;
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    meta.append(dt, dd);
  };
  addMeta(t.metaId, item.id);
  addMeta(t.typeLabel, item.type === "prompt" ? t.typePrompt : (item as MemoryItem).memoryType || t.typeMemory);
  addMeta(t.metaCreated, formatDate(item.createdAt, locale));
  if (item.type === "memory") {
    addMeta(t.metaUpdated, item.updatedAt ? formatDate(item.updatedAt, locale) : undefined);
    addMeta(t.metaTags, item.tags?.length ? item.tags.join(", ") : undefined);
    addMeta(t.metaSource, item.source);
    addMeta(t.metaProject, item.projectName);
  }
  content.append(pre, meta);
  return content;
}
