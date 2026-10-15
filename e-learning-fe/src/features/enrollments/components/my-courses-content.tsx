"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import type { CourseLevel } from "@/features/courses/types/course";
import { formatCourseLevel } from "@/features/courses/utils/course-data";
import { ApiError } from "@/lib/api/client";

import { getMyEnrollments } from "../api/enrollment-api";
import type {
  EnrollmentStatus,
  MyEnrollmentsProgressFilter,
  MyEnrollmentsQuery,
  MyEnrollmentsSortDirection,
  MyEnrollmentsSortField,
  PaginatedEnrollments,
} from "../types/enrollment";
import { MyCourseCard } from "./my-course-card";
import { MyCoursesPagination } from "./my-courses-pagination";

const MY_COURSES_PAGE_SIZE = 9;

const COURSE_LEVELS: CourseLevel[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCE",
  "ALL_LEVELS",
];

const ENROLLMENT_STATUSES: Array<Extract<EnrollmentStatus, "ACTIVE" | "COMPLETED">> =
  ["ACTIVE", "COMPLETED"];

const PROGRESS_FILTERS: Array<{
  label: string;
  value: MyEnrollmentsProgressFilter;
}> = [
  { label: "Not started", value: "not-started" },
  { label: "In progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

const SORT_OPTIONS: Array<{
  label: string;
  sortDirection: MyEnrollmentsSortDirection;
  sortField: MyEnrollmentsSortField;
}> = [
  { label: "Recently enrolled", sortDirection: "desc", sortField: "enrolledAt" },
  { label: "Oldest enrolled", sortDirection: "asc", sortField: "enrolledAt" },
  { label: "Title A-Z", sortDirection: "asc", sortField: "title" },
  { label: "Title Z-A", sortDirection: "desc", sortField: "title" },
  {
    label: "Progress high to low",
    sortDirection: "desc",
    sortField: "progressPercentage",
  },
  {
    label: "Progress low to high",
    sortDirection: "asc",
    sortField: "progressPercentage",
  },
];

const inputClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

export function MyCoursesContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, status } = useAuth();

  const [result, setResult] = useState<PaginatedEnrollments | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestedQuery, setRequestedQuery] = useState<string | null>(null);

  const query = useMemo(
    () => parseMyCoursesQuery(searchParams),
    [searchParams],
  );

  const queryKey = useMemo(() => JSON.stringify(query), [query]);
  const hasActiveFilters = hasMyCoursesFilters(query);
  const isLoading = status !== "authenticated" || requestedQuery !== queryKey;

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    let isMounted = true;

    getMyEnrollments(query, accessToken)
      .then((nextResult) => {
        if (isMounted) {
          setResult(nextResult);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError && loadError.statusCode === 401) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        setError("Unable to load your enrolled courses.");
      })
      .finally(() => {
        if (isMounted) {
          setRequestedQuery(queryKey);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, pathname, query, queryKey, router, status]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const sortValue = String(formData.get("sort") ?? "");
    const [sortField, sortDirection] = sortValue.split(":");

    setParam(params, "search", formData.get("search"));
    setParam(params, "level", formData.get("level"));
    setParam(params, "status", formData.get("status"));
    setParam(params, "progress", formData.get("progress"));

    if (sortField !== "enrolledAt" || sortDirection !== "desc") {
      setParam(params, "sortField", sortField);
      setParam(params, "sortDirection", sortDirection);
    }

    const queryString = params.toString();

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="min-h-[320px] rounded-lg border border-border bg-card p-4"
            key={index}
          >
            <div className="aspect-[16/9] rounded-md bg-muted" />
            <div className="mt-5 h-5 w-2/3 rounded-md bg-muted" />
            <div className="mt-3 h-4 w-full rounded-md bg-muted" />
            <div className="mt-2 h-4 w-5/6 rounded-md bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
        <p className="text-lg font-semibold">Courses unavailable</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {error}
        </p>
      </div>
    );
  }

  if (!result || (result.data.length === 0 && !hasActiveFilters)) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
        <p className="text-lg font-semibold">No enrolled courses yet</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Browse the catalog and enroll in a course to see it here.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
          href="/courses"
        >
          Browse courses
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <form
        className="rounded-lg border border-border bg-card p-4 shadow-sm"
        key={queryKey}
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Find enrolled courses</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, filter, and sort across all your enrolled courses.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
              href="/my-courses"
            >
              Reset
            </Link>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
              type="submit"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm font-semibold" htmlFor="myCoursesSearch">
            Search
            <input
              className={inputClasses}
              defaultValue={query.search ?? ""}
              id="myCoursesSearch"
              name="search"
              placeholder="Course title or description"
              type="search"
            />
          </label>

          <label className="text-sm font-semibold" htmlFor="myCoursesLevel">
            Level
            <select
              className={inputClasses}
              defaultValue={query.level ?? ""}
              id="myCoursesLevel"
              name="level"
            >
              <option value="">All levels</option>
              {COURSE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {formatCourseLevel(level)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold" htmlFor="myCoursesStatus">
            Status
            <select
              className={inputClasses}
              defaultValue={query.status ?? ""}
              id="myCoursesStatus"
              name="status"
            >
              <option value="">Any status</option>
              {ENROLLMENT_STATUSES.map((enrollmentStatus) => (
                <option key={enrollmentStatus} value={enrollmentStatus}>
                  {formatEnrollmentStatus(enrollmentStatus)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold" htmlFor="myCoursesProgress">
            Progress
            <select
              className={inputClasses}
              defaultValue={query.progress ?? ""}
              id="myCoursesProgress"
              name="progress"
            >
              <option value="">Any progress</option>
              {PROGRESS_FILTERS.map((progressFilter) => (
                <option key={progressFilter.value} value={progressFilter.value}>
                  {progressFilter.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold" htmlFor="myCoursesSort">
            Sort
            <select
              className={inputClasses}
              defaultValue={`${query.sortField ?? "enrolledAt"}:${
                query.sortDirection ?? "desc"
              }`}
              id="myCoursesSort"
              name="sort"
            >
              {SORT_OPTIONS.map((option) => (
                <option
                  key={option.label}
                  value={`${option.sortField}:${option.sortDirection}`}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>

      {result.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
          <p className="text-lg font-semibold">No courses match your filters</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Try changing the search keyword, filters, or sort order.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((enrollment) => (
            <MyCourseCard enrollment={enrollment} key={enrollment.id} />
          ))}
        </div>
      )}

      <MyCoursesPagination meta={result.meta} query={query} />
    </div>
  );
}

function parseMyCoursesQuery(searchParams: URLSearchParams): MyEnrollmentsQuery {
  return {
    limit: MY_COURSES_PAGE_SIZE,
    page: clampNumber(searchParams.get("page"), 1, 1),
    search: getStringParam(searchParams.get("search")),
    level: getCourseLevelParam(searchParams.get("level")),
    status: getEnrollmentStatusParam(searchParams.get("status")),
    progress: getProgressParam(searchParams.get("progress")),
    sortField: getSortFieldParam(searchParams.get("sortField")),
    sortDirection: getSortDirectionParam(searchParams.get("sortDirection")),
  };
}

function clampNumber(
  value: string | null,
  fallback: number,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function getStringParam(value: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : undefined;
}

function getCourseLevelParam(value: string | null): CourseLevel | undefined {
  const normalizedValue = getStringParam(value);

  return COURSE_LEVELS.includes(normalizedValue as CourseLevel)
    ? (normalizedValue as CourseLevel)
    : undefined;
}

function getEnrollmentStatusParam(
  value: string | null,
): Extract<EnrollmentStatus, "ACTIVE" | "COMPLETED"> | undefined {
  const normalizedValue = getStringParam(value);

  return ENROLLMENT_STATUSES.includes(
    normalizedValue as Extract<EnrollmentStatus, "ACTIVE" | "COMPLETED">,
  )
    ? (normalizedValue as Extract<EnrollmentStatus, "ACTIVE" | "COMPLETED">)
    : undefined;
}

function getProgressParam(
  value: string | null,
): MyEnrollmentsProgressFilter | undefined {
  const normalizedValue = getStringParam(value);

  return PROGRESS_FILTERS.some((progress) => progress.value === normalizedValue)
    ? (normalizedValue as MyEnrollmentsProgressFilter)
    : undefined;
}

function getSortFieldParam(
  value: string | null,
): MyEnrollmentsSortField | undefined {
  const normalizedValue = getStringParam(value);

  return SORT_OPTIONS.some((option) => option.sortField === normalizedValue)
    ? (normalizedValue as MyEnrollmentsSortField)
    : undefined;
}

function getSortDirectionParam(
  value: string | null,
): MyEnrollmentsSortDirection | undefined {
  const normalizedValue = getStringParam(value);

  return normalizedValue === "asc" || normalizedValue === "desc"
    ? normalizedValue
    : undefined;
}

function hasMyCoursesFilters(query: MyEnrollmentsQuery) {
  return Boolean(
    query.search ||
      query.level ||
      query.status ||
      query.progress ||
      query.sortField ||
      query.sortDirection,
  );
}

function setParam(
  params: URLSearchParams,
  name: string,
  value: FormDataEntryValue | string | null,
) {
  const stringValue = String(value ?? "").trim();

  if (stringValue) {
    params.set(name, stringValue);
  }
}

function formatEnrollmentStatus(status: Extract<EnrollmentStatus, "ACTIVE" | "COMPLETED">) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
