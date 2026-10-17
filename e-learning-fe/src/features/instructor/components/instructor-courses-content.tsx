"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

import {
  deleteInstructorDraftCourse,
  getInstructorCourseLatestReview,
  getInstructorCourses,
  submitInstructorCourseForReview,
} from "../api/instructor-course-api";
import type {
  InstructorCourse,
  InstructorCourseLatestReview,
} from "../types/instructor-course";
import { getSubmitLockedMessage } from "../utils/course-status";
import { getErrorMessage } from "../utils/instructor-format";
import { InstructorCourseCard } from "./instructor-course-card";
import { InstructorModal } from "./instructor-modal";

const COURSES_PAGE_SIZE = 8;

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending review", value: "PENDING_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Changes requested", value: "CHANGES_REQUESTED" },
  { label: "Rejected", value: "REJECTED" },
];

const sortOptions = [
  { label: "Newest first", value: "createdAt:desc" },
  { label: "Oldest first", value: "createdAt:asc" },
  { label: "Title A-Z", value: "title:asc" },
  { label: "Title Z-A", value: "title:desc" },
  { label: "Last updated", value: "updatedAt:desc" },
];

type AlertState = {
  message: string;
  title: string;
  variant: "error" | "success";
} | null;

type CoursesResult = {
  data: InstructorCourse[];
  meta: { page: number; total: number; totalPages: number };
};

export function InstructorCoursesContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, status } = useAuth();

  const [result, setResult] = useState<CoursesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestedQuery, setRequestedQuery] = useState<string | null>(null);
  const [latestReviewByCourse, setLatestReviewByCourse] = useState<
    Record<string, InstructorCourseLatestReview>
  >({});
  const [alertState, setAlertState] = useState<AlertState>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstructorCourse | null>(
    null,
  );
  const [submitTarget, setSubmitTarget] = useState<InstructorCourse | null>(
    null,
  );
  const [reviewTarget, setReviewTarget] = useState<InstructorCourse | null>(
    null,
  );
  const [reviewDetail, setReviewDetail] =
    useState<InstructorCourseLatestReview | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [submittingCourseId, setSubmittingCourseId] = useState<string | null>(
    null,
  );

  const query = useMemo(() => parseCoursesQuery(searchParams), [searchParams]);
  const queryKey = JSON.stringify(query);
  const isLoading = status !== "authenticated" || requestedQuery !== queryKey;

  const loadLatestReviews = useCallback(
    async (courses: InstructorCourse[], token: string) => {
      const entries = await Promise.all(
        courses.map(async (course) => {
          if (!course.id) return null;

          try {
            const review = await getInstructorCourseLatestReview(
              course.id,
              token,
            );

            return [course.id, review] as const;
          } catch {
            return null;
          }
        }),
      );

      const nextMap: Record<string, InstructorCourseLatestReview> = {};

      for (const entry of entries) {
        if (entry) {
          nextMap[entry[0]] = entry[1];
        }
      }

      setLatestReviewByCourse(nextMap);
    },
    [],
  );

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    let isMounted = true;

    getInstructorCourses(query, accessToken)
      .then(async (nextResult) => {
        if (!isMounted) return;

        setResult(nextResult);
        setError(null);

        await loadLatestReviews(nextResult.data ?? [], accessToken);
      })
      .catch((loadError) => {
        if (!isMounted) return;

        if (loadError instanceof ApiError && loadError.statusCode === 401) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        setError(getErrorMessage(loadError, "Unable to load your courses."));
      })
      .finally(() => {
        if (isMounted) {
          setRequestedQuery(queryKey);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    loadLatestReviews,
    pathname,
    query,
    queryKey,
    router,
    status,
  ]);

  function applyFilter(updates: Record<string, string>) {
    const nextParams = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    }

    if (!("page" in updates)) {
      nextParams.delete("page");
    }

    const serialized = nextParams.toString();

    router.push(serialized ? `${pathname}?${serialized}` : pathname);
  }

  async function confirmDelete() {
    if (!deleteTarget || !accessToken) return;

    try {
      setIsDeleteLoading(true);

      await deleteInstructorDraftCourse(deleteTarget.id, accessToken);

      setAlertState({
        message: "Draft course deleted.",
        title: "Success",
        variant: "success",
      });
      setDeleteTarget(null);
      setResult((current) =>
        current
          ? {
              ...current,
              data: current.data.filter(
                (course) => course.id !== deleteTarget.id,
              ),
            }
          : current,
      );
    } catch (deleteError) {
      setAlertState({
        message: getErrorMessage(deleteError, "Failed to delete the course."),
        title: "Something went wrong",
        variant: "error",
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleteLoading(false);
    }
  }

  async function confirmSubmit() {
    if (!submitTarget || !accessToken) return;

    try {
      setSubmittingCourseId(submitTarget.id);

      await submitInstructorCourseForReview(submitTarget.id, accessToken);

      setAlertState({
        message: "Course submitted for review.",
        title: "Success",
        variant: "success",
      });
      setSubmitTarget(null);
      setResult((current) =>
        current
          ? {
              ...current,
              data: current.data.map((course) =>
                course.id === submitTarget.id
                  ? { ...course, status: "PENDING_REVIEW" }
                  : course,
              ),
            }
          : current,
      );
    } catch (submitError) {
      setAlertState({
        message: getErrorMessage(
          submitError,
          "Failed to submit the course for review.",
        ),
        title: "Something went wrong",
        variant: "error",
      });
      setSubmitTarget(null);
    } finally {
      setSubmittingCourseId(null);
    }
  }

  function requestSubmit(course: InstructorCourse) {
    const lockedMessage = getSubmitLockedMessage(course.status);

    if (lockedMessage) {
      setAlertState({
        message: lockedMessage,
        title: "Cannot submit course",
        variant: "error",
      });
      return;
    }

    setSubmitTarget(course);
  }

  function openReview(course: InstructorCourse) {
    setReviewTarget(course);
    setReviewDetail(latestReviewByCourse[course.id] ?? null);
  }

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="min-h-[320px] rounded-lg border border-border bg-card p-5"
            key={index}
          >
            <div className="h-6 w-1/2 rounded-md bg-muted" />
            <div className="mt-5 h-5 w-2/3 rounded-md bg-muted" />
            <div className="mt-3 h-4 w-full rounded-md bg-muted" />
            <div className="mt-2 h-4 w-5/6 rounded-md bg-muted" />
            <div className="mt-6 h-10 w-full rounded-md bg-muted" />
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

  const currentPage = result?.meta?.page ?? query.page;
  const totalPages = result?.meta?.totalPages ?? 1;
  const totalCourses = result?.meta?.total ?? 0;
  const isSearching = Boolean(query.search) || Boolean(query.status);

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Your courses</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Draft, review and publish the courses you own. Use the course
              builder to add curriculum and assessments.
            </p>
          </div>

          <ButtonLink href="/instructor/courses/new" size="sm">
            Create Course
          </ButtonLink>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              applyFilter({ search: String(formData.get("search") ?? "") });
            }}
          >
            <input
              className="min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20"
              defaultValue={query.search ?? ""}
              name="search"
              placeholder="Search your courses..."
              type="search"
            />
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
              type="submit"
            >
              Search
            </button>
          </form>

          <select
            aria-label="Filter by status"
            className="min-h-11 rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary"
            onChange={(event) => applyFilter({ status: event.target.value })}
            value={query.status ?? ""}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort courses"
            className="min-h-11 rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary"
            onChange={(event) => applyFilter({ sort: event.target.value })}
            value={`${query.sortField}:${query.sortDirection}`}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Showing page {currentPage} of {totalPages} · {totalCourses} course
          {totalCourses === 1 ? "" : "s"} found
          {isSearching ? " for your filters" : ""}.
        </p>
      </div>
      {!result || result.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
          <p className="text-lg font-semibold">No courses found</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            {isSearching
              ? "Try a different search term or clear your filters."
              : "Create your first draft course to start building content."}
          </p>
          {!isSearching ? (
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
              href="/instructor/courses/new"
            >
              Create Course
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((course) => (
              <InstructorCourseCard
                course={course}
                highlightReview={Boolean(
                  latestReviewByCourse[course.id] &&
                  ["CHANGES_REQUESTED", "REJECTED"].includes(
                    String(
                      latestReviewByCourse[course.id].reviewStatus || "",
                    ).toUpperCase(),
                  ),
                )}
                key={course.id}
                latestReviewByCourse={latestReviewByCourse}
                onDelete={setDeleteTarget}
                onSubmitForReview={requestSubmit}
                onViewReview={openReview}
                submittingCourseId={submittingCourseId}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage <= 1}
                onClick={() => applyFilter({ page: String(currentPage - 1) })}
                type="button"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage >= totalPages}
                onClick={() => applyFilter({ page: String(currentPage + 1) })}
                type="button"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
      <InstructorModal
        onClose={() => setAlertState(null)}
        open={alertState !== null}
        title={alertState?.title ?? ""}
      >
        <p
          className={
            alertState?.variant === "success" ? "text-success" : "text-danger"
          }
        >
          {alertState?.message}
        </p>
      </InstructorModal>

      <InstructorModal
        onClose={() => setDeleteTarget(null)}
        open={deleteTarget !== null}
        title="Delete draft course"
      >
        <p>
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">
            {deleteTarget?.title}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            disabled={isDeleteLoading}
            onClick={() => setDeleteTarget(null)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleteLoading}
            onClick={confirmDelete}
            type="button"
          >
            {isDeleteLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </InstructorModal>

      <InstructorModal
        onClose={() => setSubmitTarget(null)}
        open={submitTarget !== null}
        title="Submit for review"
      >
        <p>
          Submit{" "}
          <span className="font-semibold text-foreground">
            {submitTarget?.title}
          </span>{" "}
          to the reviewer? The course information will be locked while the
          review is in progress.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            onClick={() => setSubmitTarget(null)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground"
            disabled={submittingCourseId !== null}
            onClick={confirmSubmit}
            type="button"
          >
            {submittingCourseId ? "Submitting..." : "Submit"}
          </button>
        </div>
      </InstructorModal>
      <InstructorModal
        onClose={() => {
          setReviewTarget(null);
          setReviewDetail(null);
        }}
        open={reviewTarget !== null}
        title="Reviewer feedback"
      >
        {reviewDetail ? (
          <div className="grid gap-4">
            <div className="grid gap-1 text-sm">
              <p>
                <span className="font-semibold text-foreground">
                  Review status:
                </span>{" "}
                {reviewDetail.reviewStatus}
              </p>
              <p>
                <span className="font-semibold text-foreground">
                  Course status:
                </span>{" "}
                {reviewDetail.courseStatus}
              </p>
              <p>
                <span className="font-semibold text-foreground">
                  Submitted at:
                </span>{" "}
                {new Date(reviewDetail.submittedAt).toLocaleString("vi-VN")}
              </p>
              <p>
                <span className="font-semibold text-foreground">
                  Reviewed at:
                </span>{" "}
                {reviewDetail.reviewedAt
                  ? new Date(reviewDetail.reviewedAt).toLocaleString("vi-VN")
                  : "-"}
              </p>
            </div>

            <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
              <p className="text-sm font-semibold text-warning">
                Reviewer note
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-warning">
                {reviewDetail.reviewNote?.trim() ||
                  "Reviewer did not leave a note."}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
                href={`/instructor/courses/${reviewDetail.courseId}/edit`}
              >
                Edit Course
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
                href={`/instructor/courses/${reviewDetail.courseId}/curriculum`}
              >
                Open Curriculum
              </Link>
            </div>
          </div>
        ) : (
          <p>No reviewer feedback found.</p>
        )}
      </InstructorModal>
    </div>
  );
}

function parseCoursesQuery(searchParams: URLSearchParams) {
  const [sortField, sortDirection] = (
    searchParams.get("sort") || "createdAt:desc"
  ).split(":");

  return {
    limit: COURSES_PAGE_SIZE,
    page: clampNumber(searchParams.get("page"), 1, 1),
    search: searchParams.get("search") || undefined,
    sortDirection: (sortDirection as "asc" | "desc") || "desc",
    sortField:
      (sortField as "createdAt" | "title" | "updatedAt") || "createdAt",
    status: searchParams.get("status") || undefined,
  };
}

function clampNumber(value: string | null, fallback: number, min: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(Math.trunc(parsed), min);
}
