import { apiRequest } from "@/lib/api/client";

import type {
  CreateLessonPayload,
  Lesson,
  LessonQuery,
  UpdateLessonPayload,
} from "../types/instructor-course";
import { unwrapList } from "./instructor-course-api";

export function getInstructorCourseLessons(
  courseId: string,
  sectionId: string,
  query: LessonQuery,
  accessToken: string,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    params.set(key, String(value));
  }

  const serialized = params.toString();

  return apiRequest<Lesson[]>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons${serialized ? `?${serialized}` : ""}`,
    { accessToken, method: "GET" },
  ).then(unwrapList<Lesson>);
}

export function createInstructorCourseLesson(
  courseId: string,
  sectionId: string,
  payload: CreateLessonPayload,
  accessToken: string,
) {
  return apiRequest<Lesson>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons`,
    { accessToken, body: payload, method: "POST" },
  );
}

export function updateInstructorCourseLesson(
  courseId: string,
  sectionId: string,
  lessonId: string,
  payload: UpdateLessonPayload,
  accessToken: string,
) {
  return apiRequest<Lesson>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
    { accessToken, body: payload, method: "PATCH" },
  );
}

export function deleteInstructorCourseLesson(
  courseId: string,
  sectionId: string,
  lessonId: string,
  accessToken: string,
) {
  return apiRequest<void>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
    { accessToken, method: "DELETE" },
  );
}

export function reorderInstructorCourseLessons(
  courseId: string,
  sectionId: string,
  lessonIds: string[],
  accessToken: string,
) {
  return apiRequest<Lesson[]>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/reorder`,
    { accessToken, body: { lessonIds }, method: "PATCH" },
  ).then((payload) => unwrapList<Lesson>(payload));
}
