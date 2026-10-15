import Link from "next/link";

import type { PublicCourseQuery } from "../types/course";
import type { CourseCategoryOption } from "../utils/course-data";
import { buildCourseHref, formatCourseLevel } from "../utils/course-data";

type CourseFilterSummaryProps = {
  categories: CourseCategoryOption[];
  query: PublicCourseQuery;
};

export function CourseFilterSummary({
  categories,
  query,
}: CourseFilterSummaryProps) {
  const filters = getActiveFilters(query, categories);

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <Link
          className="rounded-md border border-border bg-background px-3 py-1 text-sm text-ink-muted transition-colors hover:border-primary hover:text-primary"
          href={buildCourseHref("/courses", query, {
            [filter.key]: null,
            page: 1,
          })}
          key={filter.key}
        >
          {filter.label}
        </Link>
      ))}
      <Link className="px-2 py-1 text-sm font-semibold text-primary" href="/courses">
        Clear all
      </Link>
    </div>
  );
}

function getActiveFilters(
  query: PublicCourseQuery,
  categories: CourseCategoryOption[],
) {
  const filters: Array<{ key: keyof PublicCourseQuery; label: string }> = [];
  const categoryName = categories.find(
    (category) => category.id === query.categoryId,
  )?.name;

  if (query.search) {
    filters.push({ key: "search", label: `Search: ${query.search}` });
  }

  if (query.categoryId && categoryName) {
    filters.push({ key: "categoryId", label: `Category: ${categoryName}` });
  }

  if (query.level) {
    filters.push({ key: "level", label: `Level: ${formatCourseLevel(query.level)}` });
  }

  if (query.minPrice !== undefined && query.minPrice !== null) {
    filters.push({ key: "minPrice", label: `Min: ${query.minPrice}` });
  }

  if (query.maxPrice !== undefined && query.maxPrice !== null) {
    filters.push({ key: "maxPrice", label: `Max: ${query.maxPrice}` });
  }

  if (query.language) {
    filters.push({ key: "language", label: `Language: ${query.language}` });
  }

  if (query.certificateEnabled !== undefined && query.certificateEnabled !== null) {
    filters.push({
      key: "certificateEnabled",
      label: query.certificateEnabled ? "Certificate" : "No certificate",
    });
  }

  return filters;
}
