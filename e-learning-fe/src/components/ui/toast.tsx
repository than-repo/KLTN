"use client";

import { useEffect, useState } from "react";

type ToastVariant = "success" | "error";

type ToastProps = {
  error?: string | null;
  successMessage?: string | null;
  durationMs?: number;
};

const variantClasses: Record<ToastVariant, string> = {
  success: "border-success bg-success text-success-foreground",
  error: "border-danger bg-danger text-danger-foreground",
};

export function Toast({
  error,
  successMessage,
  durationMs = 5000,
}: ToastProps) {
  const [dismissed, setDismissed] = useState(false);

  const message = successMessage ?? error ?? null;
  const variant: ToastVariant = successMessage ? "success" : "error";

  useEffect(() => {
    setDismissed(false);

    if (!message) return;

    const timer = setTimeout(() => {
      setDismissed(true);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [message, durationMs]);

  if (!message || dismissed) return null;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-md rounded-lg border px-4 py-3 text-sm leading-6 shadow-xl ${variantClasses[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 break-words font-medium">{message}</p>

        <button
          type="button"
          aria-label="Dismiss notification"
          className="inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-current opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
          onClick={() => setDismissed(true)}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}