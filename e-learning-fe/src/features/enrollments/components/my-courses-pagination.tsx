import Link from "next/link";

import type { PaginationMeta } from "@/features/courses/types/course";
import type { MyEnrollmentsQuery } from "../types/enrollment";

type MyCoursesPaginationProps = {
  meta: PaginationMeta;
  query: MyEnrollmentsQuery;
};

export function MyCoursesPagination({ meta, query }: MyCoursesPaginationProps) {
  const pages = getVisiblePages(meta.page, meta.totalPages);

  return (
    <nav
      aria-label="My courses pagination"
      className="relative z-10 mt-1 flex w-full flex-col items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row"
    >
      <p className="text-sm text-muted-foreground">
        Page {meta.page} of {Math.max(meta.totalPages, 1)}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <PaginationLink
          disabled={!meta.hasPreviousPage}
          href={buildMyCoursesHref(meta.page - 1, query)}
          label="Previous"
        />
        <div className="flex items-center gap-2">
          {pages.map((page) => (
            <Link
              aria-current={page === meta.page ? "page" : undefined}
              className={[
                "inline-flex size-9 items-center justify-center rounded-md border text-sm",
                page === meta.page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:border-primary hover:text-primary",
              ].join(" ")}
              href={buildMyCoursesHref(page, query)}
              key={page}
            >
              {page}
            </Link>
          ))}
        </div>
        <PaginationLink
          disabled={!meta.hasNextPage}
          href={buildMyCoursesHref(meta.page + 1, query)}
          label="Next"
        />
      </div>
    </nav>
  );
}

function PaginationLink({
  disabled,
  href,
  label,
}: {
  disabled: boolean;
  href: string;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-9 items-center justify-center rounded-md border border-border px-4 text-sm text-muted-foreground opacity-60">
        {label}
      </span>
    );
  }

  return (
    <Link
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
      href={href}
    >
      {label}
    </Link>
  );
}

function buildMyCoursesHref(page: number, query: MyEnrollmentsQuery) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  setQueryParam(params, "search", query.search);
  setQueryParam(params, "level", query.level);
  setQueryParam(params, "status", query.status);
  setQueryParam(params, "progress", query.progress);
  setQueryParam(params, "sortField", query.sortField);
  setQueryParam(params, "sortDirection", query.sortDirection);

  const queryString = params.toString();

  return queryString ? `/my-courses?${queryString}` : "/my-courses";
}

function setQueryParam(
  params: URLSearchParams,
  name: string,
  value: number | string | null | undefined,
) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  params.set(name, String(value));
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  const pages: number[] = [];

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}
