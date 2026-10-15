import { apiRequest } from "@/lib/api/client";

import type {
  ActiveAttempt,
  AssessmentAnswer,
  AssessmentAttemptResult,
  AssessmentHistory,
  AssessmentQuestion,
  CreateAssessmentInput,
  CreateAttemptResponse,
  DetailedAssessment,
  InstructorAssessment,
  InstructorAssessmentQuery,
  PaginatedAssessments,
  SaveAttemptAnswerInput,
  SaveAttemptAnswerResponse,
  SubmitProjectInput,
  SubmitProjectResponse,
  UpdateAssessmentInput,
  UpdatePublishedAssessmentInput,
  UpsertAssessmentAnswerInput,
  CreateAssessmentQuestionInput,
  UpdateAssessmentQuestionInput,
  LearnerAssessment,
  LearnerCourseAssessments,
} from "../types/assessment";

type QueryValue =
  | string
  | number
  | boolean
  | Date
  | Array<string | number | boolean | Date>
  | null
  | undefined;

function buildQueryString(params?: Record<string, QueryValue>) {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }

      searchParams.set(
        key,
        value
          .map((item) =>
            item instanceof Date ? item.toISOString() : String(item),
          )
          .join(","),
      );

      return;
    }

    searchParams.set(
      key,
      value instanceof Date ? value.toISOString() : String(value),
    );
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
}

function learnerAssessmentsPath(courseId: string) {
  return `/learner/course/${courseId}/assessments`;
}

function instructorAssessmentsPath(courseId: string) {
  return `/instructor/course/${courseId}/assessments`;
}

// -----------------------------------------------------------------------------
// Learner Assessment APIs
// -----------------------------------------------------------------------------

export function getLearnerCourseAssessments(
  accessToken: string,
  courseId: string,
) {
  return apiRequest<LearnerCourseAssessments>(
    `${learnerAssessmentsPath(courseId)}`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function getLearnerAssessment(
  accessToken: string,
  courseId: string,
  assessmentId: string,
) {
  return apiRequest<LearnerAssessment>(
    `${learnerAssessmentsPath(courseId)}/${assessmentId}`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function createOrResumeAttempt(
  accessToken: string,
  courseId: string,
  assessmentId: string,
) {
  return apiRequest<CreateAttemptResponse>(
    `${learnerAssessmentsPath(courseId)}/${assessmentId}/attempts`,
    {
      accessToken,
      method: "POST",
    },
  );
}

export function getActiveAttempt(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  attemptId: string,
) {
  return apiRequest<ActiveAttempt>(
    `${learnerAssessmentsPath(courseId)}/${assessmentId}/attempts/${attemptId}`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function saveAttemptAnswer(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  attemptId: string,
  questionId: string,
  input: SaveAttemptAnswerInput,
) {
  return apiRequest<SaveAttemptAnswerResponse>(
    `${learnerAssessmentsPath(courseId)}/${assessmentId}/attempts/${attemptId}/answers/${questionId}`,
    {
      accessToken,
      body: input,
      method: "PATCH",
    },
  );
}

export function submitAttempt(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  attemptId: string,
) {
  return apiRequest<AssessmentAttemptResult>(
    `${learnerAssessmentsPath(courseId)}/${assessmentId}/attempts/${attemptId}/submit`,
    {
      accessToken,
      method: "POST",
    },
  );
}

export function getAssessmentHistory(
  accessToken: string,
  courseId: string,
  assessmentId: string,
) {
  return apiRequest<AssessmentHistory>(
    `${learnerAssessmentsPath(courseId)}/${assessmentId}/attempts`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function getAttemptResult(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  attemptId: string,
) {
  return apiRequest<AssessmentAttemptResult>(
    `${learnerAssessmentsPath(courseId)}/${assessmentId}/attempts/${attemptId}/result`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function submitProjectAssessment(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  attemptId: string,
  input: SubmitProjectInput,
) {
  return apiRequest<SubmitProjectResponse>(
    `${learnerAssessmentsPath(courseId)}/${assessmentId}/attempts/${attemptId}/project-submission`,
    {
      accessToken,
      body: input,
      method: "POST",
    },
  );
}

// -----------------------------------------------------------------------------
// Instructor Assessment APIs
// -----------------------------------------------------------------------------

export function getInstructorAssessments(
  accessToken: string,
  courseId: string,
  query?: InstructorAssessmentQuery,
) {
  return apiRequest<PaginatedAssessments>(
    `${instructorAssessmentsPath(courseId)}${buildQueryString(query)}`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function getDetailedAssessment(
  accessToken: string,
  courseId: string,
  assessmentId: string,
) {
  return apiRequest<DetailedAssessment>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/detail`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function createDraftAssessment(
  accessToken: string,
  courseId: string,
  input: CreateAssessmentInput,
) {
  return apiRequest<InstructorAssessment>(
    `${instructorAssessmentsPath(courseId)}/draft`,
    {
      accessToken,
      body: input,
      method: "POST",
    },
  );
}

export function updateDraftAssessment(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  input: UpdateAssessmentInput,
) {
  return apiRequest<InstructorAssessment>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}`,
    {
      accessToken,
      body: input,
      method: "PATCH",
    },
  );
}

export function updatePublishedAssessment(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  input: UpdatePublishedAssessmentInput,
) {
  return apiRequest<InstructorAssessment>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/published-assessment`,
    {
      accessToken,
      body: input,
      method: "PATCH",
    },
  );
}

export function publishAssessment(
  accessToken: string,
  courseId: string,
  assessmentId: string,
) {
  return apiRequest<InstructorAssessment>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/publish`,
    {
      accessToken,
      method: "PATCH",
    },
  );
}

export function deleteAssessment(
  accessToken: string,
  courseId: string,
  assessmentId: string,
) {
  return apiRequest<void>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}`,
    {
      accessToken,
      method: "DELETE",
    },
  );
}

// -----------------------------------------------------------------------------
// Instructor Question APIs
// -----------------------------------------------------------------------------

export function createAssessmentQuestion(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  input: CreateAssessmentQuestionInput,
) {
  return apiRequest<AssessmentQuestion>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/questions`,
    {
      accessToken,
      body: input,
      method: "POST",
    },
  );
}

export function getAssessmentQuestions(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  query?: {
    skip?: number;
    take?: number;
  },
) {
  return apiRequest<AssessmentQuestion[]>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/questions${buildQueryString(query)}`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function updateAssessmentQuestion(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  questionId: string,
  input: UpdateAssessmentQuestionInput,
) {
  return apiRequest<AssessmentQuestion>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/questions/${questionId}`,
    {
      accessToken,
      body: input,
      method: "PATCH",
    },
  );
}

export function deleteAssessmentQuestion(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  questionId: string,
) {
  return apiRequest<{ deleted: true }>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/questions/${questionId}`,
    {
      accessToken,
      method: "DELETE",
    },
  );
}

// -----------------------------------------------------------------------------
// Instructor Answer Key APIs
// -----------------------------------------------------------------------------

export function getAssessmentAnswer(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  questionId: string,
) {
  return apiRequest<AssessmentAnswer>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/questions/${questionId}/answer`,
    {
      accessToken,
      method: "GET",
    },
  );
}

export function upsertAssessmentAnswer(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  questionId: string,
  input: UpsertAssessmentAnswerInput,
) {
  return apiRequest<AssessmentAnswer>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/questions/${questionId}/answer`,
    {
      accessToken,
      body: input,
      method: "PATCH",
    },
  );
}

export function deleteAssessmentAnswer(
  accessToken: string,
  courseId: string,
  assessmentId: string,
  questionId: string,
) {
  return apiRequest<{ deleted: true }>(
    `${instructorAssessmentsPath(courseId)}/${assessmentId}/questions/${questionId}/answer`,
    {
      accessToken,
      method: "DELETE",
    },
  );
}
