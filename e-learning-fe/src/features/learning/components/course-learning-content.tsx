"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

import { getLearningCourseOverview } from "../api/learning-course-api";
import type { LearningCourseOverview } from "../types/learning-course";
import {
  LearningAccessState,
  LearningPageSkeleton,
} from "./learning-page-states";
import { LearningCoursePage } from "./learning-course-page";

type CourseLearningContentProps = {
  activeLessonId?: string;
  courseId: string;
  courseSlug: string;
};

type LearningLoadState = "forbidden" | "not-found" | "error" | null;

export function CourseLearningContent({
  activeLessonId,
  courseId,
  courseSlug,
}: CourseLearningContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, status, user } = useAuth();
  const [course, setCourse] = useState<LearningCourseOverview | null>(null);
  const [error, setError] = useState<LearningLoadState>(null);
  const [requestedCourseId, setRequestedCourseId] = useState<string | null>(
    null,
  );
  const loginHref = useMemo(() => {
    const queryString = searchParams.toString();
    const nextHref = queryString ? `${pathname}?${queryString}` : pathname;

    return `/login?next=${encodeURIComponent(nextHref)}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (status === "guest") {
      router.replace(loginHref);
      return;
    }

    if (status !== "authenticated" || !accessToken) {
      return;
    }

    if (user?.role !== "LEARNER") {
      return;
    }

    let isMounted = true;

    getLearningCourseOverview(courseId, accessToken)
      .then((nextCourse) => {
        if (!isMounted) {
          return;
        }

        setCourse(nextCourse);
        setError(null);
        setRequestedCourseId(courseId);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setCourse(null);

        if (loadError instanceof ApiError && loadError.statusCode === 401) {
          router.replace(loginHref);
          return;
        }

        if (loadError instanceof ApiError && loadError.statusCode === 403) {
          setError("forbidden");
          setRequestedCourseId(courseId);
          return;
        }

        if (loadError instanceof ApiError && loadError.statusCode === 404) {
          setError("not-found");
          setRequestedCourseId(courseId);
          return;
        }

        setError("error");
        setRequestedCourseId(courseId);
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, courseId, loginHref, router, status, user?.role]);

  const isWaitingForLearning =
    status === "authenticated" &&
    user?.role === "LEARNER" &&
    (!accessToken || requestedCourseId !== courseId);

  if (status === "loading" || status === "guest" || isWaitingForLearning) {
    return <LearningPageSkeleton />;
  }

  if (status === "authenticated" && user?.role !== "LEARNER") {
    return (
      <LearningAccessState
        actionHref={`/courses/${courseSlug}`}
        actionLabel="Back to course"
        message="Only learner accounts can access course learning content."
        title="Learning access unavailable"
      />
    );
  }

  if (error === "forbidden") {
    return (
      <LearningAccessState
        actionHref={`/courses/${courseSlug}`}
        actionLabel="Back to course"
        message="You are not enrolled in this course, or your enrollment no longer has learning access."
        title="Learning access unavailable"
      />
    );
  }

  if (error === "not-found") {
    return (
      <LearningAccessState
        actionHref={`/courses/${courseSlug}`}
        actionLabel="Back to course"
        message="The learning content for this course is not available."
        title="Course content unavailable"
      />
    );
  }

  if (error === "error") {
    return (
      <LearningAccessState
        actionHref="/my-courses"
        actionLabel="Back to my courses"
        message="Unable to load the learning content right now."
        title="Learning page unavailable"
      />
    );
  }

  if (!course) {
    return <LearningPageSkeleton />;
  }

  if (!accessToken) {
    return <LearningPageSkeleton />;
  }

  return (
    <LearningCoursePage
      accessToken={accessToken}
      activeLessonId={activeLessonId}
      course={course}
      courseSlug={courseSlug}
    />
  );
}
