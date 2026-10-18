import { apiRequest } from "@/lib/api/client";

import type {
  Assessment,
  CreateAssessmentPayload,
  DetailedAssessment,
  PaginatedAssessmentResponse,
  UpdateAssessmentPayload,
  UpdatePublishedAssessmentPayload,
} from "../types/instructor-assessment";

function assessmentPath(courseId: string) {
  return `/instructor/course/${courseId}/assessments`;
}

export function getInstructorAssessments(
  courseId: string,
  query: Record<string, string | number | undefined>,
  accessToken: string,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    params.set(key, String(value));
  }

  const serialized = params.toString();

  return apiRequest<PaginatedAssessmentResponse<Assessment>>(
    `${assessmentPath(courseId)}${serialized ? `?${serialized}` : ""}`,
    { accessToken, method: "GET" },
  );
}

export function getInstructorAssessmentDetail(
  courseId: string,
  assessmentId: string,
  accessToken: string,
) {
  return apiRequest<DetailedAssessment>(
    `${assessmentPath(courseId)}/${assessmentId}/detail`,
    { accessToken, method: "GET" },
  );
}

export function createInstructorAssessmentDraft(
  courseId: string,
  payload: CreateAssessmentPayload,
  accessToken: string,
) {
  return apiRequest<Assessment>(`${assessmentPath(courseId)}/draft`, {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function updateInstructorAssessment(
  courseId: string,
  assessmentId: string,
  payload: UpdateAssessmentPayload,
  accessToken: string,
) {
  return apiRequest<Assessment>(`${assessmentPath(courseId)}/${assessmentId}`, {
    accessToken,
    body: payload,
    method: "PATCH",
  });
}

export function deleteInstructorAssessment(
  courseId: string,
  assessmentId: string,
  accessToken: string,
) {
  return apiRequest<void>(`${assessmentPath(courseId)}/${assessmentId}`, {
    accessToken,
    method: "DELETE",
  });
}

export function updatePublishedInstructorAssessment(
  courseId: string,
  assessmentId: string,
  payload: UpdatePublishedAssessmentPayload,
  accessToken: string,
) {
  return apiRequest<Assessment>(
    `${assessmentPath(courseId)}/${assessmentId}/published-assessment`,
    { accessToken, body: payload, method: "PATCH" },
  );
}

export function publishInstructorAssessment(
  courseId: string,
  assessmentId: string,
  accessToken: string,
) {
  return apiRequest<Assessment>(
    `${assessmentPath(courseId)}/${assessmentId}/publish`,
    { accessToken, method: "PATCH" },
  );
}
