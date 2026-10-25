export function getReviewerStatusStyle(status: string) {
  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === "APPROVED") {
    return "bg-green-50 text-green-700 border border-green-100";
  }

  if (normalizedStatus === "REJECTED") {
    return "bg-red-50 text-red-700 border border-red-100";
  }

  if (normalizedStatus === "CHANGES_REQUESTED") {
    return "bg-yellow-50 text-yellow-700 border border-yellow-100";
  }

  return "bg-zinc-50 text-zinc-700 border border-zinc-100";
}

export function getReviewerDecisionLabel(status: string) {
  if (status === "APPROVED") return "Approve Course";
  if (status === "REJECTED") return "Reject Course";
  return "Request Changes";
}

export function getReviewerDecisionDescription(status: string) {
  if (status === "APPROVED") {
    return "This course will be approved. Make sure the course information, curriculum, lessons, and media files are acceptable.";
  }

  if (status === "REJECTED") {
    return "This course will be rejected. Rejected courses may become archived, so the instructor may not be able to edit it again. A clear note is required.";
  }

  return "This course will be sent back to the instructor for updates. A clear note is required so the instructor knows what to improve.";
}

export function getReviewerDecisionVariant(status: string) {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  return "warning";
}

export function formatReviewerDateTime(value?: string | Date | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ErrorResponse = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

export function getErrorMessage(err: unknown, fallback: string) {
  const error = err as ErrorResponse;

  if (
    typeof err === "object" &&
    err !== null &&
    "response" in error &&
    typeof error.response?.data?.message === "string"
  ) {
    return error.response.data.message;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "response" in error &&
    Array.isArray(error.response?.data?.message)
  ) {
    return error.response.data.message.join(", ");
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}
