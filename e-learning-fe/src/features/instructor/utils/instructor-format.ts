import { ApiError } from "@/lib/api/client";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatDateTime(value?: string | Date | null) {
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

export function formatFileSize(sizeInBytes?: number | null) {
  if (!sizeInBytes || sizeInBytes <= 0) return "-";

  const units = ["B", "KB", "MB", "GB"];
  const tier = Math.min(
    Math.floor(Math.log(sizeInBytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = sizeInBytes / 1024 ** tier;

  return `${value.toFixed(tier === 0 ? 0 : 1)} ${units[tier]}`;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatVndInput(value: string) {
  const digits = onlyDigits(value);

  if (!digits) return "";

  return Number(digits).toLocaleString("vi-VN");
}

export function parseVndInput(value: string) {
  const digits = onlyDigits(value);

  if (!digits) return undefined;

  return Number(digits);
}
