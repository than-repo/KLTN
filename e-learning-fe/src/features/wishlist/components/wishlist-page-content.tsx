"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { getPublicCoursesByIds } from "@/features/courses/api/course-api";
import type { PublicCourse } from "@/features/courses/types/course";
import { WishlistCourseCard } from "@/features/wishlist/components/wishlist-course-card";
import { WishlistEmptyState } from "./wishlist-empty-state";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";

export function WishlistPageContent() {
  const { status } = useAuth();
  const { items, loading, error } = useWishlist();
  const [courseResult, setCourseResult] = useState<{
    ids: string;
    courses: PublicCourse[];
  } | null>(null);
  const [courseFailure, setCourseFailure] = useState<{
    ids: string;
    message: string;
  } | null>(null);

  const isGuest = status === "guest";
  const courseIds = useMemo(
    () => items.map((item) => item.courseId).join(","),
    [items],
  );

  useEffect(() => {
    if (status !== "authenticated" || !courseIds) {
      return;
    }

    let active = true;
    const ids = courseIds.split(",");
    const requests: Promise<PublicCourse[]>[] = [];
    for (let index = 0; index < ids.length; index += 50) {
      requests.push(getPublicCoursesByIds(ids.slice(index, index + 50)));
    }

    Promise.all(requests)
      .then((results) => {
        if (active) {
          setCourseResult({ ids: courseIds, courses: results.flat() });
        }
      })
      .catch((courseError: unknown) => {
        if (active) {
          setCourseFailure({
            ids: courseIds,
            message:
              courseError instanceof Error
                ? courseError.message
                : "Unable to load wishlist course details.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [courseIds, status]);

  const courses = courseResult?.ids === courseIds ? courseResult.courses : [];
  const coursesError =
    courseFailure?.ids === courseIds ? courseFailure.message : null;
  const coursesLoading =
    Boolean(courseIds) &&
    courseResult?.ids !== courseIds &&
    courseFailure?.ids !== courseIds;
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const availableItems = items.flatMap((item) => {
    const course = coursesById.get(item.courseId);
    return course ? [{ item, course }] : [];
  });

  if (isGuest) {
    return (
      <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="rounded-lg border border-border bg-card px-5 py-16 text-center">
          <svg
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M4.318 6.318a3.125 3.125 0 0 1 4.424 0l1.59 1.59 1.59-1.59a3.125 3.125 0 0 1 4.424 0l1.59 1.59a3.125 3.125 0 0 1-4.424 4.424L12 14.17l-3.592 3.592a3.125 3.125 0 0 1-4.424-4.424l1.59-1.59z"
            />
          </svg>
          <h2 className="mt-6 text-2xl font-semibold">
            Sign in to view your wishlist
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Log in to see the courses you have saved and manage your wishlist.
          </p>
          <a
            className="mt-6 inline-flex min-h-10 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
            href="/login"
          >
            Sign in
          </a>
        </div>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="rounded-lg border border-border bg-card px-5 py-16 text-center text-muted-foreground">
          Checking your session...
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Wishlist
        </h1>
        <p className="mt-2 text-base leading-7 text-muted-foreground">
          Courses you have saved to review or enroll in later.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-danger bg-danger/5 px-5 py-4 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {coursesError ? (
        <div className="mt-4 rounded-lg border border-danger bg-danger/5 px-5 py-4 text-sm text-danger">
          {coursesError}
        </div>
      ) : null}

      {loading || coursesLoading ? (
        <div className="rounded-lg border border-border bg-card px-5 py-16 text-center text-muted-foreground">
          Loading your wishlist...
        </div>
      ) : items.length === 0 ? (
        <WishlistEmptyState />
      ) : availableItems.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {availableItems.map(({ item, course }) => (
            <WishlistCourseCard
              key={course.id}
              course={course}
              wishlistItem={item}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          The saved courses are no longer available for public viewing.
        </div>
      )}
    </section>
  );
}
