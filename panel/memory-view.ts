import {
  mountButton,
  mountEmpty,
  mountSearchField,
  mountSelect,
  type SearchFieldHandle,
  type SelectHandle,
  type SelectOption,
} from "@openchamber/sdk/ui";
import type { MemoryApi } from "./api";
import { openConfirm, openDialog, type DialogHandle } from "./dialog";
import { buildDetailContent, formatDate } from "./detail";
import type { Messages } from "./i18n";
import type { AppAction, AppState } from "./state";
import type { MemoryItem, MemoryPage, PromptItem } from "./types";

export type MemoryViewDeps = {
  api: MemoryApi;
  dispatch: (action: AppAction) => void;
  reload: () => Promise<void>;
  strings: (locale: string) => Messages;
  toast: (kind: "success" | "error", message: string) => void;
};

export type MemoryViewHandle = {
  update(state: AppState): void;
  dispose(): void;
};

type RowItem = MemoryItem | PromptItem;

function parseTags(value: string): string[] | undefined {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length ? tags : undefined;
}

export function mountMemoryView(root: Element, deps: MemoryViewDeps): MemoryViewHandle {
  let latest: AppState | undefined;
  let busy = false;
  let tagsLoaded = false;
  let tagOptions: SelectOption[] = [];
  let rowSignature = "";
  let detailDialog: DialogHandle | null = null;

  const text = (): Messages => deps.strings(latest?.locale ?? "en");

  const toolbar = document.createElement("div");
  toolbar.className = "memory-toolbar";
  const searchRoot = document.createElement("div");
  searchRoot.className = "memory-toolbar__search";
  const selectRoot = document.createElement("div");
  selectRoot.className = "memory-toolbar__filter";
  const actions = document.createElement("div");
  actions.className = "memory-toolbar__actions";
  toolbar.append(searchRoot, selectRoot, actions);

  const rows = document.createElement("div");
  rows.className = "memory-rows";
  const bulkBar = document.createElement("div");
  bulkBar.className = "memory-bulk";
  const emptyRoot = document.createElement("div");
  const pagination = document.createElement("nav");
  pagination.className = "memory-pagination";
  pagination.setAttribute("aria-label", "");
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "memory-pagination__button";
  previous.dataset.action = "prev";
  const pageInfo = document.createElement("span");
  pageInfo.className = "memory-pagination__info";
  const next = document.createElement("button");
  next.type = "button";
  next.className = "memory-pagination__button";
  next.dataset.action = "next";
  pagination.append(previous, pageInfo, next);

  root.append(toolbar, bulkBar, rows, emptyRoot, pagination);

  const search: SearchFieldHandle = mountSearchField(searchRoot, {
    value: "",
    placeholder: "",
    label: "",
    onChange: (value) => deps.dispatch({ type: "QUERY_DRAFT_CHANGED", query: value }),
  });
  const filter: SelectHandle = mountSelect(selectRoot, {
    label: "",
    value: null,
    options: [],
    placeholder: "",
    onChange: (id) => {
      deps.dispatch({ type: "TAG_CHANGED", tag: id || null });
      void deps.reload();
    },
  });
  const addButton = mountButton(actions, { label: "", variant: "default", size: "sm", onClick: () => openForm() });
  const cleanupButton = mountButton(actions, {
    label: "",
    variant: "outline",
    size: "sm",
    onClick: () => confirmMaintenance("cleanup"),
  });
  const dedupeButton = mountButton(actions, {
    label: "",
    variant: "outline",
    size: "sm",
    onClick: () => confirmMaintenance("dedupe"),
  });
  const bulkDeleteButton = mountButton(bulkBar, { label: "", variant: "destructive", size: "sm", onClick: () => confirmBulkDelete() });
  const empty = mountEmpty(emptyRoot, { title: "", body: "" });

  function submitQuery(): void {
    if (!latest) return;
    deps.dispatch({ type: "QUERY_SUBMITTED", query: latest.queryDraft });
    void deps.reload();
  }

  searchRoot.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitQuery();
    }
  });
  searchRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".oc-sdk-search-clear")) {
      submitQuery();
    }
  });

  async function mutate(run: () => Promise<unknown>, successKey: keyof Messages): Promise<boolean> {
    if (busy) return false;
    busy = true;
    root.classList.add("is-busy");
    try {
      await run();
      deps.toast("success", text()[successKey] as string);
      await deps.reload();
      return true;
    } catch {
      deps.toast("error", text().actionFailed);
      return false;
    } finally {
      busy = false;
      root.classList.remove("is-busy");
    }
  }

  function selectedItem(id: string): RowItem | undefined {
    return latest?.memoryPage.items.find((item) => item.id === id);
  }

  function openDetail(item: RowItem): void {
    const t = text();
    const content = buildDetailContent(item, t, latest?.locale ?? "en");
    detailDialog = openDialog({
      title: t.details,
      content,
      closeLabel: t.close,
      kind: "drawer",
      onClose: () => {
        detailDialog = null;
        if (latest?.selectedMemoryId) {
          deps.dispatch({ type: "MEMORY_SELECTED", id: null });
        }
      },
    });
  }

  function openForm(item?: MemoryItem): void {
    const t = text();
    const editing = Boolean(item);
    const content = document.createElement("form");
    content.className = "memory-form";
    content.addEventListener("submit", (event) => event.preventDefault());

    const makeField = (labelText: string, input: HTMLElement) => {
      const label = document.createElement("label");
      label.className = "memory-form__label";
      label.textContent = labelText;
      label.append(input);
      return label;
    };

    const tagInput = document.createElement("input");
    tagInput.className = "memory-form__input";
    tagInput.type = "text";
    tagInput.value = item?.tags?.join(", ") ?? "";
    const contentArea = document.createElement("textarea");
    contentArea.className = "memory-form__textarea";
    contentArea.rows = 6;
    contentArea.value = item?.content ?? "";

    const error = document.createElement("p");
    error.className = "memory-form__error";
    error.hidden = true;
    error.setAttribute("role", "alert");

    const actionsRow = document.createElement("div");
    actionsRow.className = "memory-form__actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "memory-form__button";
    cancel.textContent = t.cancelButton;
    const save = document.createElement("button");
    save.type = "button";
    save.className = "memory-form__button memory-form__button--primary";
    save.textContent = t.save;
    actionsRow.append(cancel, save);

    let containerTagInput: HTMLInputElement | undefined;
    if (!editing) {
      containerTagInput = document.createElement("input");
      containerTagInput.className = "memory-form__input";
      containerTagInput.type = "text";
      content.append(makeField(t.formContainerTag, containerTagInput));
    }
    content.append(
      makeField(t.formContent, contentArea),
      makeField(t.formTags, tagInput),
      error,
      actionsRow,
    );

    const dialog = openDialog({
      title: editing ? t.edit : t.addMemory,
      content,
      closeLabel: t.close,
    });
    cancel.addEventListener("click", dialog.close);
    save.addEventListener("click", () => {
      const contentValue = contentArea.value.trim();
      const containerValue = containerTagInput?.value.trim() ?? "";
      if (!editing && !containerValue) {
        error.textContent = t.validationTag;
        error.hidden = false;
        containerTagInput?.focus();
        return;
      }
      if (!contentValue) {
        error.textContent = t.validationContent;
        error.hidden = false;
        contentArea.focus();
        return;
      }
      error.hidden = true;
      const tags = parseTags(tagInput.value);
      void mutate(
        () =>
          editing && item
            ? deps.api.updateMemory(item.id, { content: contentValue, ...(tags ? { tags } : {}) })
            : deps.api.createMemory({ containerTag: containerValue, content: contentValue, ...(tags ? { tags } : {}) }),
        editing ? "updated" : "created",
      ).then((ok) => {
        if (ok) dialog.close();
      });
    });
  }

  function confirmDelete(item: MemoryItem): void {
    const t = text();
    openConfirm({
      title: t.confirmDeleteTitle,
      message: t.confirmDeleteBody,
      confirmLabel: t.confirmButton,
      cancelLabel: t.cancelButton,
      closeLabel: t.close,
      destructive: true,
      onConfirm: () => void mutate(() => deps.api.deleteMemory(item.id), "deleted"),
    });
  }

  function confirmBulkDelete(): void {
    const ids = latest?.selectedIds ?? [];
    if (!ids.length) return;
    const t = text();
    openConfirm({
      title: t.confirmBulkDeleteTitle,
      message: `${ids.length} — ${t.confirmDeleteBody}`,
      confirmLabel: t.confirmButton,
      cancelLabel: t.cancelButton,
      closeLabel: t.close,
      destructive: true,
      onConfirm: () => void mutate(() => deps.api.bulkDelete(ids), "bulkDeleted"),
    });
  }

  function confirmMaintenance(kind: "cleanup" | "dedupe"): void {
    const t = text();
    const cleanup = kind === "cleanup";
    openConfirm({
      title: cleanup ? t.confirmCleanupTitle : t.confirmDeduplicateTitle,
      message: cleanup ? t.confirmCleanupBody : t.confirmDeduplicateBody,
      confirmLabel: t.confirmButton,
      cancelLabel: t.cancelButton,
      closeLabel: t.close,
      destructive: true,
      onConfirm: () =>
        void mutate(
          () => (cleanup ? deps.api.cleanup() : deps.api.deduplicate()),
          cleanup ? "cleaned" : "deduplicated",
        ),
    });
  }

  rows.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !latest) return;
    const control = target.closest<HTMLElement>("[data-action]");
    if (!control) return;
    const id = control.dataset.id;
    if (!id) return;
    const item = selectedItem(id);
    if (!item) return;
    if (control.dataset.action === "details") {
      deps.dispatch({ type: "MEMORY_SELECTED", id });
      return;
    }
    if (item.type !== "memory") return;
    const memory = item;
    switch (control.dataset.action) {
      case "edit":
        openForm(memory);
        break;
      case "pin":
        void mutate(() => deps.api.pinMemory(memory.id), "pinned");
        break;
      case "unpin":
        void mutate(() => deps.api.unpinMemory(memory.id), "unpinned");
        break;
      case "delete":
        confirmDelete(memory);
        break;
    }
  });

  rows.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.select) {
      deps.dispatch({ type: "SELECTION_TOGGLED", id: target.dataset.select });
    }
  });

  pagination.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !latest) return;
    const control = target.closest<HTMLElement>("[data-action]");
    if (!control) return;
    const delta = control.dataset.action === "prev" ? -1 : 1;
    deps.dispatch({ type: "PAGE_CHANGED", page: latest.page + delta });
    void deps.reload();
  });

  function renderRows(state: AppState, t: Messages): void {
    const signature = `${state.locale};${JSON.stringify(state.memoryPage.items)}`;
    if (signature !== rowSignature) {
      rowSignature = signature;
      rows.replaceChildren();
      for (const item of state.memoryPage.items) {
        rows.append(buildRow(item, state, t));
      }
    } else {
      for (const row of Array.from(rows.children)) {
        if (!(row instanceof HTMLElement) || !row.dataset.id) continue;
        const checkbox = row.querySelector<HTMLInputElement>("input[data-select]");
        if (checkbox) {
          checkbox.checked = state.selectedIds.includes(row.dataset.id);
        }
      }
    }
  }

  function buildRow(item: RowItem, state: AppState, t: Messages): HTMLElement {
    const row = document.createElement("article");
    row.className = "memory-row";
    row.dataset.id = item.id;

    if (item.type === "memory") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "memory-row__select";
      checkbox.dataset.select = item.id;
      checkbox.checked = state.selectedIds.includes(item.id);
      checkbox.setAttribute("aria-label", `${t.selectRow}: ${item.id}`);
      row.append(checkbox);
    }

    const main = document.createElement("div");
    main.className = "memory-row__main";
    const badges = document.createElement("div");
    badges.className = "memory-row__badges";
    const typeBadge = document.createElement("span");
    typeBadge.className = "memory-badge memory-badge--type";
    typeBadge.textContent = item.type === "prompt" ? t.typePrompt : item.memoryType || t.typeMemory;
    badges.append(typeBadge);
    if (item.type === "memory") {
      if (item.isPinned) {
        const badge = document.createElement("span");
        badge.className = "memory-badge memory-badge--pinned";
        badge.textContent = t.badgePinned;
        badges.append(badge);
      }
      if (item.isStaged) {
        const badge = document.createElement("span");
        badge.className = "memory-badge memory-badge--staged";
        badge.textContent = t.badgeStaged;
        badges.append(badge);
      }
      if (item.source) {
        const badge = document.createElement("span");
        badge.className = "memory-badge memory-badge--source";
        badge.textContent = item.source;
        badges.append(badge);
      }
    }

    const excerpt = document.createElement("p");
    excerpt.className = "memory-row__content";
    excerpt.textContent = item.content;

    const meta = document.createElement("div");
    meta.className = "memory-row__meta";
    if (item.type === "memory" && item.tags?.length) {
      for (const tag of item.tags) {
        const chip = document.createElement("span");
        chip.className = "memory-chip";
        chip.textContent = tag;
        meta.append(chip);
      }
    }
    const date = document.createElement("time");
    date.className = "memory-row__date";
    date.dateTime = item.createdAt;
    date.textContent = formatDate(item.createdAt, state.locale);
    meta.append(date);

    main.append(badges, excerpt, meta);
    row.append(main);

    const actions = document.createElement("div");
    actions.className = "memory-row__actions";
    const addAction = (label: string, action: string, variant: string) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `memory-row__button memory-row__button--${variant}`;
      button.dataset.action = action;
      button.dataset.id = item.id;
      button.textContent = label;
      actions.append(button);
    };
    addAction(t.details, "details", "ghost");
    if (item.type === "memory") {
      addAction(t.edit, "edit", "ghost");
      addAction(item.isPinned ? t.unpinAction : t.pinAction, item.isPinned ? "unpin" : "pin", "ghost");
      addAction(t.remove, "delete", "danger");
    }
    row.append(actions);
    return row;
  }

  async function loadTags(): Promise<void> {
    if (tagsLoaded) return;
    tagsLoaded = true;
    try {
      const result = await deps.api.getTags();
      tagOptions = result.project.map((entry) => ({
        id: entry.tag,
        label: entry.projectName || entry.displayName || entry.tag,
        hint: entry.tag,
      }));
    } catch {
      tagsLoaded = false;
    }
  }

  function update(state: AppState): void {
    latest = state;
    const t = deps.strings(state.locale);
    search.update({ value: state.queryDraft, placeholder: t.searchPlaceholder, label: t.searchLabel });
    const visibleOptions: SelectOption[] = tagOptions.length
      ? [{ id: "", label: t.allProjects }, ...tagOptions]
      : [];
    filter.update({
      label: t.filterLabel,
      value: state.selectedTag,
      options: visibleOptions,
      placeholder: state.selectedTag ? undefined : t.allProjects,
      disabled: visibleOptions.length <= 1,
    });
    addButton.update({ label: t.addMemory });
    cleanupButton.update({ label: t.cleanupAction });
    dedupeButton.update({ label: t.deduplicateAction });
    bulkDeleteButton.update({ label: `${t.deleteSelected} (${state.selectedIds.length})` });
    bulkBar.hidden = state.selectedIds.length === 0;
    empty.update({ title: t.emptyListTitle, body: t.emptyListBody });
    emptyRoot.hidden = state.memoryPage.items.length > 0 || state.loading || Boolean(state.error);

    renderRows(state, t);

    const totalPages = Math.max(1, state.memoryPage.totalPages);
    pageInfo.textContent = `${state.page} / ${totalPages}`;
    pageInfo.setAttribute("aria-label", `${t.page} ${state.page} / ${totalPages}`);
    previous.setAttribute("aria-label", t.previous);
    next.setAttribute("aria-label", t.next);
    pagination.setAttribute("aria-label", t.paginationLabel);
    previous.textContent = t.previous;
    next.textContent = t.next;
    previous.disabled = state.page <= 1;
    next.disabled = state.page >= totalPages;

    if (state.selectedMemoryId && !detailDialog) {
      const item = selectedItem(state.selectedMemoryId);
      if (item) openDetail(item);
    } else if (!state.selectedMemoryId && detailDialog) {
      const dialog = detailDialog;
      detailDialog = null;
      dialog.close();
    }

    void loadTags();
  }

  function dispose(): void {
    detailDialog?.close();
    search.dispose();
    filter.dispose();
    addButton.dispose();
    cleanupButton.dispose();
    dedupeButton.dispose();
    bulkDeleteButton.dispose();
    empty.dispose();
    root.replaceChildren();
  }

  return { update, dispose };
}
