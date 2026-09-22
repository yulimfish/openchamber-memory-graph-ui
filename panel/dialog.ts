type DialogOptions = {
  title: string;
  content: Node;
  closeLabel: string;
  kind?: "dialog" | "drawer";
  onClose?: () => void;
};

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose?: () => void;
};

export type DialogHandle = {
  close(): void;
};

let activeDialog: DialogHandle | null = null;

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function openDialog({ title, content, closeLabel, kind = "dialog", onClose }: DialogOptions): DialogHandle {
  activeDialog?.close();
  const restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const overlay = document.createElement("div");
  const panel = document.createElement("section");
  const heading = document.createElement("h2");
  const closeButton = document.createElement("button");
  const titleId = `memory-dialog-${crypto.randomUUID()}`;
  let closed = false;

  overlay.className = "memory-overlay";
  panel.className = `memory-dialog memory-dialog--${kind}`;
  panel.tabIndex = -1;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", titleId);
  heading.id = titleId;
  heading.textContent = title;
  closeButton.type = "button";
  closeButton.className = "memory-dialog__close";
  closeButton.setAttribute("aria-label", closeLabel);
  closeButton.textContent = "×";
  panel.append(heading, closeButton, content);
  overlay.append(panel);

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    if (activeDialog === handle) activeDialog = null;
    restoreFocus?.focus();
    onClose?.();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    if (!panel.contains(document.activeElement)) {
      event.preventDefault();
      focusableElements(panel)[0]?.focus() ?? panel.focus();
      return;
    }
    const focusable = focusableElements(panel);
    if (!focusable.length) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  closeButton.addEventListener("click", close);
  overlay.addEventListener("pointerdown", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", onKeyDown);
  document.body.append(overlay);
  closeButton.focus();
  const handle: DialogHandle = { close };
  activeDialog = handle;
  return handle;
}

export function openConfirm({
  title,
  message,
  confirmLabel,
  cancelLabel,
  closeLabel,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmOptions): DialogHandle {
  const content = document.createElement("div");
  const text = document.createElement("p");
  const actions = document.createElement("div");
  const cancel = document.createElement("button");
  const confirm = document.createElement("button");

  text.className = "memory-confirm__message";
  text.textContent = message;
  actions.className = "memory-confirm__actions";
  cancel.type = "button";
  cancel.className = "memory-confirm__button";
  cancel.textContent = cancelLabel;
  confirm.type = "button";
  confirm.className = destructive
    ? "memory-confirm__button memory-confirm__button--destructive"
    : "memory-confirm__button memory-confirm__button--primary";
  confirm.textContent = confirmLabel;
  actions.append(cancel, confirm);
  content.append(text, actions);

  const dialog = openDialog({ title, content, closeLabel, onClose });
  cancel.addEventListener("click", dialog.close);
  confirm.addEventListener("click", () => {
    onConfirm();
    dialog.close();
  });
  (destructive ? cancel : confirm).focus();
  return dialog;
}
