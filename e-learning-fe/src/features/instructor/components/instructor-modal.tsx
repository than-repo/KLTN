"use client";

import type { ReactNode } from "react";

import { X } from "lucide-react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

type InstructorModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
  size?: ModalSize;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  full: "max-w-4xl",
};

export function InstructorModal({
  children,
  onClose,
  open,
  title,
  size = "md",
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
      <div className={`w-full ${sizeClasses[size]} rounded-lg border border-border bg-card p-6 shadow-xl relative`}>
        <button
          type="button"
          className="absolute top-4 right-4 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X className="size-5" />
        </button>
        <h2 className="text-lg font-semibold">{title}</h2>

        <div className="mt-3 text-sm leading-6 text-foreground">
          {children}
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
