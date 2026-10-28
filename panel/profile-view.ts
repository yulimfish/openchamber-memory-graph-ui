import { mountBanner, mountButton, mountEmpty, mountSpinner, type ButtonHandle } from "@openchamber/sdk/ui";
import { MemoryApiError, type MemoryApi } from "./api";
import { errorCopy, type Messages } from "./i18n";
import { formatDate } from "./detail";
import type { AppState } from "./state";
import type { ProfileSignal, ProfileWorkflow, UserProfile } from "./types";

export type ProfileViewDeps = {
  api: MemoryApi;
  strings: (locale: string) => Messages;
  toast: (kind: "success" | "error", message: string) => void;
};

export type ProfileViewHandle = {
  update(state: AppState): void;
  dispose(): void;
};

export type ProfileGroup<T> = {
  label: string;
  items: T[];
};

export function groupProfileItems<T extends { category?: string }>(
  items: T[],
  fallbackLabel: string,
): ProfileGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const label = item.category?.trim() || fallbackLabel;
    const bucket = groups.get(label) ?? [];
    bucket.push(item);
    groups.set(label, bucket);
  }
  return [...groups.entries()]
    .map(([label, bucket]) => ({ label, items: bucket }))
    .sort((a, b) => b.items.length - a.items.length);
}

export function formatCount(value: number | undefined, locale: string): string | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US").format(value);
}

export function formatConfidence(value: number | undefined, locale = "en"): string | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatAlphaBeta(alpha: number | undefined, beta: number | undefined, locale = "en"): string | null {
  if (alpha === undefined || beta === undefined) return null;
  return `${formatCount(alpha, locale)}/${formatCount(beta, locale)}`;
}

export function mountProfileView(root: Element, deps: ProfileViewDeps): ProfileViewHandle {
  let locale = "en";
  let active = false;
  let status: "idle" | "loading" | "refreshing" | "ready" | "error" = "idle";
  let profile: UserProfile | null = null;
  let error: MemoryApiError | null = null;
  let loadedOnce = false;

  const text = (): Messages => deps.strings(locale);

  const header = document.createElement("div");
  header.className = "profile__header";
  const summary = document.createElement("div");
  summary.className = "profile__summary";
  header.append(summary);
  const feedback = document.createElement("div");
  feedback.className = "profile__feedback";
  const spinnerRoot = document.createElement("div");
  const errorRoot = document.createElement("div");
  const emptyRoot = document.createElement("div");
  feedback.append(spinnerRoot, errorRoot, emptyRoot);
  const body = document.createElement("div");
  body.className = "profile__body";
  root.append(header, feedback, body);

  const refreshButton: ButtonHandle = mountButton(header, {
    label: "",
    variant: "outline",
    size: "sm",
    onClick: () => void refreshProfile(),
  });
  const spinner = mountSpinner(spinnerRoot, { label: "" });
  const errorBanner = mountBanner(errorRoot, {
    tone: "error",
    title: "",
    body: "",
    action: { label: "", onClick: () => void loadProfile(true) },
  });
  const empty = mountEmpty(emptyRoot, { title: "", body: "" });

  async function loadProfile(force: boolean): Promise<void> {
    if (status === "loading" || status === "refreshing") return;
    if (!force && loadedOnce) return;
    status = "loading";
    error = null;
    paint();
    try {
      profile = await deps.api.getUserProfile();
      loadedOnce = true;
      status = "ready";
    } catch (caught) {
      error = caught instanceof MemoryApiError ? caught : null;
      status = "error";
    }
    paint();
  }

  async function refreshProfile(): Promise<void> {
    if (status === "loading" || status === "refreshing") return;
    status = "refreshing";
    error = null;
    paint();
    try {
      await deps.api.refreshUserProfile();
      deps.toast("success", text().profileRefreshed);
      profile = await deps.api.getUserProfile();
      loadedOnce = true;
      status = "ready";
    } catch (caught) {
      error = caught instanceof MemoryApiError ? caught : null;
      status = "error";
      deps.toast("error", errorCopy(text(), error?.code ?? "UPSTREAM_ERROR").title);
    }
    paint();
  }

  function signalStats(item: ProfileSignal): string[] {
    const stats: string[] = [];
    const confidence = formatConfidence(item.confidence, locale);
    if (confidence) stats.push(confidence);
    const alphaBeta = formatAlphaBeta(item.alpha, item.beta, locale);
    if (alphaBeta) stats.push(alphaBeta);
    if (item.pendingValidation) stats.push("…");
    return stats;
  }

  function renderSection(title: string, items: ProfileSignal[] | undefined, workflows: boolean): void {
    if (!items?.length) return;
    const t = text();
    const section = document.createElement("section");
    section.className = "profile__section";
    const heading = document.createElement("h2");
    heading.className = "profile__section-title";
    heading.textContent = title;
    section.append(heading);
    for (const group of groupProfileItems(items, t.uncategorized)) {
      const groupBlock = document.createElement("div");
      groupBlock.className = "profile__group";
      const groupHeading = document.createElement("h3");
      groupHeading.className = "profile__group-title";
      groupHeading.textContent = `${group.label} (${group.items.length})`;
      groupBlock.append(groupHeading);
      for (const item of group.items) {
        const card = document.createElement("article");
        card.className = "profile__item";
        const description = document.createElement("p");
        description.className = "profile__item-description";
        description.textContent = item.description;
        card.append(description);
        const stats = signalStats(item);
        if (stats.length) {
          const statsRow = document.createElement("div");
          statsRow.className = "profile__item-stats";
          for (const stat of stats) {
            const badge = document.createElement("span");
            badge.className = "profile__stat";
            badge.textContent = stat;
            statsRow.append(badge);
          }
          card.append(statsRow);
        }
        if (workflows) {
          const steps = (item as ProfileWorkflow).steps;
          if (steps?.length) {
            const list = document.createElement("ol");
            list.className = "profile__steps";
            for (const step of steps) {
              const li = document.createElement("li");
              li.textContent = step;
              list.append(li);
            }
            card.append(list);
          }
        }
        if (item.evidence?.length) {
          const evidence = document.createElement("ul");
          evidence.className = "profile__evidence";
          for (const entry of item.evidence.slice(0, 3)) {
            const li = document.createElement("li");
            li.textContent = entry;
            evidence.append(li);
          }
          card.append(evidence);
        }
        groupBlock.append(card);
      }
      section.append(groupBlock);
    }
    body.append(section);
  }

  function paint(): void {
    const t = text();
    refreshButton.update({
      label: t.refreshProfile,
      loading: status === "refreshing",
      disabled: status === "loading",
    });
    spinner.update({ label: t.loading, size: "sm" });
    if (error) {
      const copy = errorCopy(t, error.code);
      errorBanner.update({
        title: copy.title,
        body: copy.body,
        action: { label: t.retry, onClick: () => void loadProfile(true) },
      });
    }
    empty.update({ title: t.profileEmptyTitle, body: t.profileEmptyBody });

    summary.replaceChildren();
    if (status === "ready" && profile) {
      const name = document.createElement("strong");
      name.className = "profile__name";
      name.textContent = profile.displayName || profile.userName || t.profile;
      summary.append(name);
      const addMeta = (label: string, value: string | number | undefined | null) => {
        if (value === undefined || value === null || value === "") return;
        const span = document.createElement("span");
        span.className = "profile__meta";
        span.textContent = `${label}: ${value}`;
        summary.append(span);
      };
      addMeta(t.profileVersion, profile.version);
      addMeta(t.profileAnalyzed, profile.lastAnalyzedAt ? formatDate(profile.lastAnalyzedAt, locale) : undefined);
      addMeta(t.profilePrompts, formatCount(profile.totalPromptsAnalyzed, locale) ?? undefined);
    }

    const showSpinner = status === "loading" || status === "refreshing";
    const showError = status === "error";
    const hasProfile = status === "ready" && Boolean(profile?.profileData);
    const showEmpty = status === "ready" && !hasProfile;
    spinnerRoot.hidden = !showSpinner;
    errorRoot.hidden = !showError;
    emptyRoot.hidden = !showEmpty;
    feedback.hidden = !showSpinner && !showError && !showEmpty;
    body.hidden = !hasProfile;

    body.replaceChildren();
    if (hasProfile && profile?.profileData) {
      renderSection(t.preferences, profile.profileData.preferences, false);
      renderSection(t.patterns, profile.profileData.patterns, false);
      renderSection(t.workflows, profile.profileData.workflows, true);
    }
  }

  function update(state: AppState): void {
    locale = state.locale;
    const nextActive = state.activeView === "profile";
    if (nextActive && !active) {
      active = true;
      paint();
      void loadProfile(false);
      return;
    }
    active = nextActive;
    if (active) paint();
  }

  function dispose(): void {
    refreshButton.dispose();
    spinner.dispose();
    errorBanner.dispose();
    empty.dispose();
    root.replaceChildren();
  }

  return { update, dispose };
}
