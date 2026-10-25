"use client";

import type { ReviewDecisionStatus } from "../types/reviewer";
import {
  getReviewerDecisionDescription,
  getReviewerDecisionLabel,
  getReviewerDecisionVariant,
} from "../utils/reviewer-format";

type ReviewerDecisionModalProps = {
  open: boolean;
  onClose: () => void;
  decision: ReviewDecisionStatus;
  note: string;
  submitting: boolean;
  onConfirm: () => void;
};

const variantIconMap: Record<string, string> = {
  success: "✓",
  warning: "↻",
  danger: "✗",
};

const variantClassMap: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
};

const buttonClassMap: Record<string, string> = {
  success: "bg-green-600 hover:bg-green-700",
  warning: "bg-yellow-600 hover:bg-yellow-700",
  danger: "bg-red-600 hover:bg-red-700",
};

export function ReviewerDecisionModal({
  open,
  onClose,
  decision,
  note,
  submitting,
  onConfirm,
}: ReviewerDecisionModalProps) {
  if (!open) return null;

  const variant = getReviewerDecisionVariant(decision);
  const label = getReviewerDecisionLabel(decision);
  const description = getReviewerDecisionDescription(decision);

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto flex min-h-full max-w-md items-center justify-center">
        <div className="max-h-[90vh] w-full overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${variantClassMap[variant] ?? variantClassMap.success}`}
          >
            <span className="text-sm font-bold">
              {variantIconMap[variant] ?? variantIconMap.success}
            </span>
          </div>

          <h2 className="text-lg font-semibold text-zinc-900">{label}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>

          <div className="mt-5 rounded-xl border border-zinc-200 p-4">
            <p className="text-xs font-medium uppercase text-zinc-500 mb-1">
              Decision
            </p>
            <p className="mt-1 font-semibold text-zinc-900">{decision}</p>

            <p className="mt-4 text-xs font-medium uppercase text-zinc-500 mb-1">
              Review note
            </p>
            <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border bg-white p-3">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">
                {note.trim() || "No note provided."}
              </p>
            </div>
          </div>

          {decision === "REJECTED" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              Rejected courses may become archived. The instructor may not be
              able to edit this course again, so make sure your note is clear.
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassMap[variant] ?? buttonClassMap.success}`}
            >
              {submitting ? "Submitting..." : "Submit Decision"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
