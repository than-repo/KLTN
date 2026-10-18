import { apiRequest } from "@/lib/api/client";

import type {
  CreateLessonFilePayload,
  FileMediaQuery,
  LessonFileMedia,
  UpdateLessonFilePayload,
  UploadSignaturePayload,
  UploadSignatureResponse,
} from "../types/instructor-course";
import { unwrapList } from "./instructor-course-api";

export function createInstructorLessonFile(
  courseId: string,
  sectionId: string,
  lessonId: string,
  payload: CreateLessonFilePayload,
  accessToken: string,
) {
  return apiRequest<LessonFileMedia>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/files`,
    { accessToken, body: payload, method: "POST" },
  );
}

export function getInstructorLessonFiles(
  courseId: string,
  sectionId: string,
  lessonId: string,
  query: FileMediaQuery,
  accessToken: string,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    params.set(key, String(value));
  }

  const serialized = params.toString();

  return apiRequest<LessonFileMedia[]>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/files${serialized ? `?${serialized}` : ""}`,
    { accessToken, method: "GET" },
  ).then(unwrapList<LessonFileMedia>);
}

export function updateInstructorLessonFile(
  courseId: string,
  sectionId: string,
  lessonId: string,
  fileMediaId: string,
  payload: UpdateLessonFilePayload,
  accessToken: string,
) {
  return apiRequest<LessonFileMedia>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/files/${fileMediaId}`,
    { accessToken, body: payload, method: "PATCH" },
  );
}

export function deleteInstructorLessonFile(
  courseId: string,
  sectionId: string,
  lessonId: string,
  fileMediaId: string,
  accessToken: string,
) {
  return apiRequest<void>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/files/${fileMediaId}`,
    { accessToken, method: "DELETE" },
  );
}

export function getUploadSignature(
  payload: UploadSignaturePayload,
  accessToken: string,
) {
  return apiRequest<UploadSignatureResponse>("/upload/signature", {
    accessToken,
    body: payload,
    method: "POST",
  });
}
