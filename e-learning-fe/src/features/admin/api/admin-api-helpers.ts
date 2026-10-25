import type { AdminCourseCategory } from "../types/admin-category";

function normalizeBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE"
  );
}

export function normalizeAdminCategory(
  category: AdminCourseCategory,
): AdminCourseCategory {
  return {
    ...category,
    isActive: normalizeBoolean(category.isActive),
  };
}

export function flattenCategories(
  categories: AdminCourseCategory[],
): AdminCourseCategory[] {
  const result: AdminCourseCategory[] = [];

  function walk(items: AdminCourseCategory[]) {
    for (const item of items) {
      result.push(item);

      if (item.children?.length) {
        walk(item.children);
      }
    }
  }

  walk(categories);

  return result;
}

export function formatEnumLabel(value?: string | null) {
  if (!value) return "-";

  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDateInput(value?: string | Date | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().split("T")[0];
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
