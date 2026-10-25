import { apiRequest } from "@/lib/api/client";

import type {
  ClaimCourseReviewResponse,
  PaginatedResponse,
  QueryValue,
  ReviewerCourseReviewWorkspace,
  ReviewerCourseSummary,
  ReviewerCourseTask,
  SubmitCourseReviewDecisionPayload,
  SubmitCourseReviewDecisionResponse,
} from "../types/reviewer";

export type { QueryValue };

export function buildQueryString(query?: Record<string, QueryValue>) {
  if (!query) return "";

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    params.set(key, String(value));
  }

  const serialized = params.toString();

  return serialized ? `?${serialized}` : "";
}

export function getReviewerAvailableCourses(
  query: Record<string, QueryValue>,
  accessToken: string,
) {
  return apiRequest<PaginatedResponse<ReviewerCourseSummary>>(
    `/reviewer/courses/available${buildQueryString(query)}`,
    { accessToken, method: "GET" },
  );
}

export function getReviewerMyTasks(
  query: Record<string, QueryValue>,
  accessToken: string,
) {
  return apiRequest<PaginatedResponse<ReviewerCourseTask>>(
    `/reviewer/courses${buildQueryString(query)}`,
    { accessToken, method: "GET" },
  );
}

export function claimReviewerCourse(courseId: string, accessToken: string) {
  if (!courseId || courseId === "undefined") {
    throw new Error("Missing courseId when claiming course.");
  }

  return apiRequest<ClaimCourseReviewResponse>(
    `/reviewer/courses/${courseId}/claim`,
    { accessToken, method: "POST" },
  );
}

export function getReviewerReviewWorkspace(
  reviewId: string,
  accessToken: string,
) {
  if (!reviewId || reviewId === "undefined") {
    throw new Error("Missing reviewId when loading review workspace.");
  }

  return apiRequest<ReviewerCourseReviewWorkspace>(
    `/reviewer/courses/${reviewId}`,
    { accessToken, method: "GET" },
  );
}

export function submitReviewerDecision(
  reviewId: string,
  payload: SubmitCourseReviewDecisionPayload,
  accessToken: string,
) {
  if (!reviewId || reviewId === "undefined") {
    throw new Error("Missing reviewId when submitting review decision.");
  }

  return apiRequest<SubmitCourseReviewDecisionResponse>(
    `/reviewer/courses/${reviewId}/decision`,
    { accessToken, body: payload, method: "PATCH" },
  );
}
