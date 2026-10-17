import { apiRequest } from "@/lib/api/client";

import type {
  CreateCoursePayload,
  CreateSectionPayload,
  InstructorCourse,
  InstructorCourseLatestReview,
  InstructorCoursesResponse,
  Section,
  SectionQuery,
  UpdateCoursePayload,
  UpdateSectionPayload,
} from "../types/instructor-course";

export type QueryValue = string | number | boolean | undefined | null;

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

export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.results)) return record.results as T[];
  }

  return [];
}

export function getInstructorCourses(
  query: Record<string, QueryValue>,
  accessToken: string,
) {
  return apiRequest<InstructorCoursesResponse>(
    `/instructor/courses${buildQueryString(query)}`,
    { accessToken, method: "GET" },
  );
}

export function createInstructorCourse(
  payload: CreateCoursePayload,
  accessToken: string,
) {
  return apiRequest<InstructorCourse>("/instructor/courses", {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function updateInstructorCourse(
  courseId: string,
  payload: UpdateCoursePayload,
  accessToken: string,
) {
  return apiRequest<InstructorCourse>(`/instructor/courses/${courseId}`, {
    accessToken,
    body: payload,
    method: "PATCH",
  });
}

export function submitInstructorCourseForReview(
  courseId: string,
  accessToken: string,
) {
  return apiRequest<InstructorCourse>(
    `/instructor/courses/${courseId}/submit-for-review`,
    { accessToken, method: "PATCH" },
  );
}

export function deleteInstructorDraftCourse(
  courseId: string,
  accessToken: string,
) {
  return apiRequest<void>(`/instructor/courses/${courseId}/draft`, {
    accessToken,
    method: "DELETE",
  });
}

export function getInstructorCourseLatestReview(
  courseId: string,
  accessToken: string,
) {
  return apiRequest<InstructorCourseLatestReview>(
    `/instructor/courses/${courseId}/reviews/latest`,
    { accessToken, method: "GET" },
  );
}

export function getInstructorCourseSections(
  courseId: string,
  query: SectionQuery,
  accessToken: string,
) {
  return apiRequest<Section[]>(
    `/instructor/courses/${courseId}/sections${buildQueryString(query)}`,
    { accessToken, method: "GET" },
  ).then(unwrapList<Section>);
}

export function createInstructorCourseSection(
  courseId: string,
  payload: CreateSectionPayload,
  accessToken: string,
) {
  return apiRequest<Section>(`/instructor/courses/${courseId}/sections`, {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function updateInstructorCourseSection(
  courseId: string,
  sectionId: string,
  payload: UpdateSectionPayload,
  accessToken: string,
) {
  return apiRequest<Section>(
    `/instructor/courses/${courseId}/sections/${sectionId}`,
    { accessToken, body: payload, method: "PATCH" },
  );
}

export function deleteInstructorCourseSection(
  courseId: string,
  sectionId: string,
  accessToken: string,
) {
  return apiRequest<void>(
    `/instructor/courses/${courseId}/sections/${sectionId}`,
    { accessToken, method: "DELETE" },
  );
}

export function updateInstructorCourseSectionStatus(
  courseId: string,
  sectionId: string,
  isActive: boolean,
  accessToken: string,
) {
  return apiRequest<Section>(
    `/instructor/courses/${courseId}/sections/${sectionId}/status`,
    { accessToken, body: { isActive }, method: "PATCH" },
  );
}

export function reorderInstructorCourseSections(
  courseId: string,
  sectionIds: string[],
  accessToken: string,
) {
  return apiRequest<Section[]>(
    `/instructor/courses/${courseId}/sections/reorder`,
    { accessToken, body: { sectionIds }, method: "PATCH" },
  ).then((payload) => unwrapList<Section>(payload));
}
