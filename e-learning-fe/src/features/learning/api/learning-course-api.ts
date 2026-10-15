import { apiRequest } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/config/env";

import type {
  CourseLearningResponse,
  LearningLessonDetail,
  LearningPaginationQuery,
  LearningSectionsResponse,
  LearningSectionLessonsResponse,
  LearningCourseOverview,
} from "../types/learning-course";

export function getCourseLearning(courseId: string, accessToken: string) {
  return apiRequest<CourseLearningResponse>(
    `/learning/courses/${encodeURIComponent(courseId)}/detail-learning`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function getLearningCourseOverview(
  courseId: string,
  accessToken: string,
) {
  return apiRequest<LearningCourseOverview>(
    buildLearningV2Url(`/learning/courses/${encodeURIComponent(courseId)}`),
    {
      accessToken,
      method: "GET",
    },
  );
}

export function getLearningSections(
  courseId: string,
  accessToken: string,
  query: LearningPaginationQuery = {},
) {
  return apiRequest<LearningSectionsResponse>(
    buildLearningV2Url(
      `/learning/courses/${encodeURIComponent(courseId)}/sections${buildPaginationQueryString(query)}`,
    ),
    {
      accessToken,
      method: "GET",
    },
  );
}

export function getLearningSectionLessons(
  courseId: string,
  sectionId: string,
  accessToken: string,
  query: LearningPaginationQuery = {},
) {
  return apiRequest<LearningSectionLessonsResponse>(
    buildLearningV2Url(
      `/learning/courses/${encodeURIComponent(
        courseId,
      )}/sections/${encodeURIComponent(sectionId)}/lessons${buildPaginationQueryString(query)}`,
    ),
    {
      accessToken,
      method: "GET",
    },
  );
}

export function getLearningLessonDetail(
  courseId: string,
  lessonId: string,
  accessToken: string,
) {
  return apiRequest<LearningLessonDetail>(
    buildLearningV2Url(
      `/learning/courses/${encodeURIComponent(
        courseId,
      )}/lessons/${encodeURIComponent(lessonId)}`,
    ),
    {
      accessToken,
      method: "GET",
    },
  );
}

function buildLearningV2Url(path: string) {
  const baseUrl = getApiBaseUrl();
  const v2BaseUrl = /\/v\d+$/i.test(baseUrl)
    ? baseUrl.replace(/\/v\d+$/i, "/v2")
    : `${baseUrl}/v2`;

  return `${v2BaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildPaginationQueryString(query: LearningPaginationQuery) {
  const params = new URLSearchParams();

  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }

  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}
