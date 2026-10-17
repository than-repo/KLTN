import { apiRequest } from "@/lib/api/client";

import type {
  AssessmentAnswer,
  AssessmentQuestion,
  CreateAssessmentQuestionPayload,
  UpdateAssessmentQuestionPayload,
  UpsertAssessmentAnswerPayload,
} from "../types/instructor-assessment";

function questionPath(courseId: string, assessmentId: string) {
  return `/instructor/course/${courseId}/assessments/${assessmentId}/questions`;
}

export function getInstructorAssessmentQuestions(
  courseId: string,
  assessmentId: string,
  accessToken: string,
) {
  return apiRequest<AssessmentQuestion[]>(
    questionPath(courseId, assessmentId),
    { accessToken, method: "GET" },
  );
}

export function createInstructorAssessmentQuestion(
  courseId: string,
  assessmentId: string,
  payload: CreateAssessmentQuestionPayload,
  accessToken: string,
) {
  return apiRequest<AssessmentQuestion>(questionPath(courseId, assessmentId), {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function updateInstructorAssessmentQuestion(
  courseId: string,
  assessmentId: string,
  questionId: string,
  payload: UpdateAssessmentQuestionPayload,
  accessToken: string,
) {
  return apiRequest<AssessmentQuestion>(
    `${questionPath(courseId, assessmentId)}/${questionId}`,
    { accessToken, body: payload, method: "PATCH" },
  );
}

export function deleteInstructorAssessmentQuestion(
  courseId: string,
  assessmentId: string,
  questionId: string,
  accessToken: string,
) {
  return apiRequest<void>(
    `${questionPath(courseId, assessmentId)}/${questionId}`,
    { accessToken, method: "DELETE" },
  );
}

export function upsertInstructorAssessmentAnswer(
  courseId: string,
  assessmentId: string,
  questionId: string,
  payload: UpsertAssessmentAnswerPayload,
  accessToken: string,
) {
  return apiRequest<AssessmentAnswer>(
    `${questionPath(courseId, assessmentId)}/${questionId}/answer`,
    { accessToken, body: payload, method: "PATCH" },
  );
}

export function getInstructorAssessmentAnswer(
  courseId: string,
  assessmentId: string,
  questionId: string,
  accessToken: string,
) {
  return apiRequest<AssessmentAnswer>(
    `${questionPath(courseId, assessmentId)}/${questionId}/answer`,
    { accessToken, method: "GET" },
  );
}

export function deleteInstructorAssessmentAnswer(
  courseId: string,
  assessmentId: string,
  questionId: string,
  accessToken: string,
) {
  return apiRequest<void>(
    `${questionPath(courseId, assessmentId)}/${questionId}/answer`,
    { accessToken, method: "DELETE" },
  );
}
