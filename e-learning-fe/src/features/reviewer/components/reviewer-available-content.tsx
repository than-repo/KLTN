"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

import { getReviewerAvailableCourses } from "../api/reviewer-api";
import type {
  PaginatedResponse,
  ReviewerCourseSummary,
} from "../types/reviewer";
import { ReviewerCourseCard } from "./reviewer-course-card";

const PAGE_SIZE = 10;

type AvailableResult = {
  data: ReviewerCourseSummary[];
  meta: { page: number; total: number; totalPages: number };
};

export function ReviewerAvailableContent() {
  const { accessToken, status } = useAuth();
  const [result, setResult] = useState<AvailableResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      sortField: "updatedAt",
      sortDirection: "desc" as const,
    }),
    [page, search],
  );

  const loadCourses = useCallback(async () => {
    if (status !== "authenticated" || !accessToken) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = await getReviewerAvailableCourses(query, accessToken);
      const data: PaginatedResponse<ReviewerCourseSummary> =
        payload as unknown as PaginatedResponse<ReviewerCourseSummary>;
      setResult({
        data: data.data ?? [],
        meta: {
          page: data.meta?.page ?? 1,
          total: data.meta?.total ?? 0,
          totalPages: data.meta?.totalPages ?? 1,
        },
      });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Failed to load available courses.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, query, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch must update local state on mount
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset page when search changes
    setPage(1);
  }, [search]);

  if (status !== "authenticated") {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">
            Unable to load available courses
          </h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={loadCourses}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const courses = result?.data ?? [];
  const meta = result?.meta ?? { page: 1, total: 0, totalPages: 1 };

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Available Courses
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Claim a course submitted for review that matches your authorized
            categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-lg font-semibold text-foreground">
            No available courses
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no courses available to claim at the moment.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <ReviewerCourseCard key={course.id} course={course} />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {courses.length} of {meta.total} courses
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || meta.page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={loading || meta.page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
