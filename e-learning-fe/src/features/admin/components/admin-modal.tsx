"use client";

import type { ReactNode } from "react";

import { X } from "lucide-react";

type AdminModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
  /** Additional className for modal container (e.g., max-w-2xl) */
  className?: string;
  /** Whether to show the header close button (X icon) */
  showCloseButton?: boolean;
};

export function AdminModal({
  children,
  onClose,
  open,
  title,
  className = "",
  showCloseButton = true,
}: AdminModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-label={title}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
    >
      <div className={`max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-card shadow-xl ${className}`}>
        <div className="flex items-start justify-between gap-4 p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

type AdminStatusMessageProps = {
  variant: "error" | "success";
};

export function AdminStatusMessage({
  children,
  variant,
}: AdminStatusMessageProps & { children: ReactNode }) {
  const classes =
    variant === "success"
      ? "border border-success/30 bg-success/10 text-success"
      : "border border-danger/30 bg-danger/10 text-danger";

  return (
    <p
      className={`rounded-md px-4 py-3 text-sm leading-6 ${classes}`}
      role={variant === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
