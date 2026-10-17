"use client";

import type { ReactNode } from "react";

type InstructorModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function InstructorModal({
  children,
  onClose,
  open,
  title,
}: InstructorModalProps) {
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
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>

        <div className="mt-3 text-sm leading-6 text-muted-foreground">
          {children}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type InstructorStatusMessageProps = {
  variant: "error" | "success";
};

export function InstructorStatusMessage({
  children,
  variant,
}: InstructorStatusMessageProps & { children: ReactNode }) {
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
