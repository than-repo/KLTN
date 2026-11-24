export type AssessmentType = "QUIZ";

export type AssessmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type AssessmentReviewTiming =
  | "NEVER"
  | "AFTER_SUBMIT"
  | "AFTER_GRADED"
  | "AFTER_ASSESSMENT_CLOSED"
  | "MANUAL";

export type AssessmentReviewContent =
  | "SCORE_ONLY"
  | "SCORE_AND_ANSWERS"
  | "FULL_REVIEW";

export type AssessmentQuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_IN_THE_BLANK";

export type PaginationMeta = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type PaginatedAssessmentResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type Assessment = {
  assessmentReviewContent?: AssessmentReviewContent | null;
  assessmentReviewTiming?: AssessmentReviewTiming | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  afterLessonId?: string | null;
  courseId: string;
  createdAt?: string;
  description?: string | null;
  id: string;
  isActive?: boolean;
  maxAttempts?: number | null;
  order: number;
  passingScore?: number | null;
  reviewContent?: AssessmentReviewContent | null;
  reviewTiming?: AssessmentReviewTiming | null;
  status?: AssessmentStatus;
  timeLimitMinutes?: number | null;
  title: string;
  totalPoints: number;
  type: AssessmentType;
  updatedAt?: string;
  // Blueprint settings
  easyQuestionCount?: number | null;
  mediumQuestionCount?: number | null;
  hardQuestionCount?: number | null;
  questionNumber?: number | null;
};

export type CreateAssessmentPayload = {
  availableFrom?: string;
  availableUntil?: string;
  afterLesson?: string;
  description?: string;
  maxAttempts?: number;
  passingScore?: number;
  timeLimitMinutes?: number;
  title: string;
  type: AssessmentType;
};

export type UpdateAssessmentPayload = {
  active?: boolean;
  availableFrom?: string | null;
  availableUntil?: string | null;
  afterLesson?: string | null;
  description?: string | null;
  isActive?: boolean;
  maxAttempts?: number | null;
  order?: number;
  passingScore?: number | null;
  timeLimitMinutes?: number | null;
  title?: string;
  type?: AssessmentType;
};

export type UpdateAssessmentBlueprintPayload = {
  easyQuestionCount: number;
  mediumQuestionCount: number;
  hardQuestionCount: number;
};

export type AssessmentBlueprintResponse = {
  assessmentId: string;
  easyQuestionCount: number;
  mediumQuestionCount: number;
  hardQuestionCount: number;
  questionNumber: number;
};

export type UpdatePublishedAssessmentPayload = {
  active?: boolean;
  assessmentReviewContent?: AssessmentReviewContent | null;
  assessmentReviewTiming?: AssessmentReviewTiming | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  isActive?: boolean;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
};

export type AssessmentAnswer = {
  correctOptionAnswer?: string | null;
  correctTextAnswer?: string | null;
  createdAt?: string;
  id: string;
  questionId: string;
  updatedAt?: string;
  wrongAnswers?: string[] | null;
};

export type UpsertAssessmentAnswerPayload = {
  correctOptionAnswer?: string;
  correctTextAnswer?: string;
  wrongAnswers?: string[];
};

import type { Skill } from "./instructor-skill";
export type { Skill } from "./instructor-skill";

export type AssessmentQuestion = {
  activation?: boolean;
  answer?: AssessmentAnswer | null;
  assessmentId: string;
  createdAt?: string;
  explanation?: string | null;
  id: string;
  isActive?: boolean;
  order: number;
  points: number;
  questionText: string;
  type: AssessmentQuestionType;
  skillIds?: string[];
  // API returns populated skill objects on detail endpoint
  skills?: Skill[];
  updatedAt?: string;
};

export type CreateAssessmentQuestionPayload = {
  explanation?: string;
  points?: number;
  questionText: string;
  type: AssessmentQuestionType;
  skillIds?: string[];
};

export type UpdateAssessmentQuestionPayload =
  Partial<CreateAssessmentQuestionPayload>;

export type DetailedAssessment = Assessment & {
  questions: AssessmentQuestion[];
  status: AssessmentStatus;
};