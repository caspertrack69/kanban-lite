"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { InlineAlert } from "./inline-alert";
import { Loader2 } from "lucide-react";

function useNativeDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return ref;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  placement = "center",
  className,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  placement?: "center" | "right";
  className?: string;
  bodyClassName?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const ref = useNativeDialog(open, onClose);

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={handleBackdrop}
      className={cn(
        "fixed z-50 text-kl-text",
        placement === "center" &&
          "m-auto w-[calc(100%-2rem)] max-w-lg rounded-kl-sheet border border-kl-border bg-kl-card p-0 shadow-kl-overlay",
        placement === "right" &&
          "inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-xl rounded-none border-l border-kl-border bg-kl-card p-0 shadow-kl-overlay sm:rounded-l-kl-sheet",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col",
          placement === "center" && "max-h-[min(85dvh,760px)]",
          placement === "right" && "h-dvh",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-kl-divider px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-kl-section-title text-kl-text"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-kl-meta text-kl-text-muted"
              >
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
            <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
          </IconButton>
        </header>

        <div
          className={cn(
            "kl-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-kl-divider px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  pending = false,
  error,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  pending?: boolean;
  error?: string | null;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? (
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin"
                strokeWidth={1.5}
              />
            ) : null}
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error ? <InlineAlert className="mt-3">{error}</InlineAlert> : null}
    </Dialog>
  );
}
