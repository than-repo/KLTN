export type ISODateString = string;

export type AssessmentType = "QUIZ" | "PROJECT";

export type AssessmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type AssessmentAttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "GRADED"
  | "PASSED"
  | "FAILED";

export type AssessmentQuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_IN_THE_BLANK"
  | "PROJECT";

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

export type LearnerAssessmentState =
  | "CAN_START"
  | "CAN_CONTINUE"
  | "COMPLETED"
  | "MAX_ATTEMPTS_REACHED"
  | "NOT_AVAILABLE"
  | "LOCKED";

export type LearnerAssessmentAction =
  | "START"
  | "CONTINUE"
  | "VIEW_RESULT"
  | "NONE";

export type CreateAttemptAction = "CREATED" | "RESUMED";

export type ProjectSubmissionStatus =
  | "SUBMITTED"
  | "REVIEWED"
  | "NEEDS_CHANGES"
  | "ACCEPTED"
  | "REJECTED";

export type AssessmentOrderField =
  | "createdAt"
  | "updatedAt"
  | "title"
  | "order"
  | "totalPoints"
  | "availableFrom"
  | "availableUntil";

export type OrderDirection = "asc" | "desc";

// -----------------------------------------------------------------------------
// Shared / Instructor assessment types
// -----------------------------------------------------------------------------

export type InstructorAssessment = {
  id: string;
  courseId: string;

  title: string;
  description?: string | null;
  type: AssessmentType;
  status: AssessmentStatus;

  order: number;
  totalPoints: number;
  passingScore?: number | null;

  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;

  availableFrom?: ISODateString | null;
  availableUntil?: ISODateString | null;

  isActive: boolean;

  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt?: ISODateString | null;
};

export type InstructorAssessmentQuery = {
  id?: string;
  ids?: string[];

  courseId?: string;

  type?: AssessmentType;
  types?: AssessmentType[];

  status?: AssessmentStatus;
  statuses?: AssessmentStatus[];

  isActive?: boolean;
  includeDeleted?: boolean;

  search?: string;

  availableFromGte?: ISODateString;
  availableUntilLte?: ISODateString;
  createdAtGte?: ISODateString;
  updatedAtGte?: ISODateString;

  orderBy?: AssessmentOrderField;
  orderDirection?: OrderDirection;

  page?: number;
  limit?: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedAssessments = {
  data: InstructorAssessment[];
  meta: PaginationMeta;
};

export type CreateAssessmentInput = {
  title: string;
  description?: string;
  type: AssessmentType;

  passingScore?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number;

  availableFrom?: ISODateString;
  availableUntil?: ISODateString;
};

export type UpdateAssessmentInput = {
  title?: string;
  description?: string | null;
  type?: AssessmentType;

  order?: number;

  passingScore?: number | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;

  availableFrom?: ISODateString | null;
  availableUntil?: ISODateString | null;

  isActive?: boolean;
};

export type UpdatePublishedAssessmentInput = {
  availableFrom?: ISODateString | null;
  availableUntil?: ISODateString | null;

  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;

  assessmentReviewTiming?: AssessmentReviewTiming;
  assessmentReviewContent?: AssessmentReviewContent;

  isActive?: boolean;
};

// -----------------------------------------------------------------------------
// Question / answer key types
// -----------------------------------------------------------------------------

export type AssessmentQuestion = {
  id: string;

  /**
   * Present for instructor responses.
   * Learner active-attempt questions use ActiveAttemptQuestion instead.
   */
  assessmentId?: string;

  questionText: string;
  type: AssessmentQuestionType;
  explanation?: string | null;

  points: number;
  order: number;

  isActive?: boolean;

  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  deletedAt?: ISODateString | null;
};

export type CreateAssessmentQuestionInput = {
  questionText: string;
  type: AssessmentQuestionType;
  explanation?: string;
  points?: number;
};

export type UpdateAssessmentQuestionInput =
  Partial<CreateAssessmentQuestionInput>;

export type AssessmentAnswer = {
  id: string;
  questionId: string;

  correctOptionAnswer?: string | null;
  correctTextAnswer?: string | null;
  wrongAnswers?: string[] | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type UpsertAssessmentAnswerInput = {
  correctOptionAnswer?: string | null;
  correctTextAnswer?: string | null;
  wrongAnswers?: string[] | null;
};

export type DetailedAssessmentAnswer = AssessmentAnswer;

export type DetailedAssessmentQuestion = AssessmentQuestion & {
  assessmentId: string;
  isActive: boolean;
  answer?: DetailedAssessmentAnswer | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt?: ISODateString | null;
};

export type DetailedAssessment = InstructorAssessment & {
  questions: DetailedAssessmentQuestion[];
};

// -----------------------------------------------------------------------------
// Learner entry page types
// -----------------------------------------------------------------------------

export type LearnerCourseAssessmentItem = {
  id: string;
  title: string;
  description?: string | null;
  type: AssessmentType;

  order: number;
  totalPoints: number;
  passingScore?: number | null;

  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;

  availableFrom?: ISODateString | null;
  availableUntil?: ISODateString | null;
};

export type LearnerCourseAssessments = {
  assessments: LearnerCourseAssessmentItem[];
  serverNow: ISODateString;
};

export type LearnerLatestAttempt = {
  attemptId: string;
  attemptNumber: number;
  status: AssessmentAttemptStatus | string;

  score?: number | null;
  maxScore?: number | null;
  passed: boolean;

  startedAt: ISODateString;
  submittedAt?: ISODateString | null;

  expiresAt?: ISODateString | null;
  remainingSeconds?: number | null;
};

export type LearnerAssessment = {
  assessmentId: string;

  title: string;
  description?: string | null;
  type: AssessmentType | string;

  totalPoints: number;
  passingScore?: number | null;

  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;

  availableFrom?: ISODateString | null;
  availableUntil?: ISODateString | null;

  attemptsUsed: number;
  attemptsRemaining?: number | null;

  state: LearnerAssessmentState;
  primaryAction: LearnerAssessmentAction;

  latestAttempt?: LearnerLatestAttempt | null;

  serverNow: ISODateString;
  message?: string | null;
};

// -----------------------------------------------------------------------------
// Learner attempt types
// -----------------------------------------------------------------------------

export type CreateAttemptResponse = {
  action: CreateAttemptAction;

  attemptId: string;
  assessmentId: string;
  attemptNumber: number;

  status: AssessmentAttemptStatus | string;

  startedAt: ISODateString;
  expiresAt?: ISODateString | null;

  remainingSeconds?: number | null;
  serverNow: ISODateString;
};

export type ActiveAttemptQuestion = {
  questionId: string;

  questionText: string;
  type: AssessmentQuestionType;

  points: number;
  order: number;

  options?: string[] | null;
};

export type ActiveAttemptSavedAnswer = {
  questionId: string;
  answer?: string | null;
  savedAt: ISODateString;
};

export type ActiveProjectRequirement = {
  title: string;
  description?: string | null;
  requirement: string;
  totalPoints: number;
  note?: string | null;
};

export type ActiveAttempt = {
  attemptId: string;
  assessmentId: string;

  assessmentTitle: string;
  assessmentDescription?: string | null;

  type: AssessmentType;
  status: AssessmentAttemptStatus;

  attemptNumber: number;

  totalPoints: number;
  passingScore?: number | null;

  startedAt: ISODateString;
  expiresAt?: ISODateString | null;

  remainingSeconds?: number | null;
  serverNow: ISODateString;

  questions: ActiveAttemptQuestion[];
  savedAnswers: ActiveAttemptSavedAnswer[];

  projectRequirement?: ActiveProjectRequirement | null;
};

export type SaveAttemptAnswerInput = {
  answer: string;
  answerSnapshot?: string;
};

export type SaveAttemptAnswerResponse = {
  attemptId: string;
  questionId: string;

  saved: boolean;
  savedAt: ISODateString;

  remainingSeconds?: number | null;
  serverNow: ISODateString;
};

// -----------------------------------------------------------------------------
// Learner attempt history / result types
// -----------------------------------------------------------------------------

export type AssessmentHistoryItem = {
  attemptId: string;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  score?: number | null;
  maxScore?: number | null;
  passed: boolean;

  startedAt: ISODateString;
  submittedAt?: ISODateString | null;

  canContinue: boolean;
  canViewResult: boolean;
};

export type AssessmentHistory = {
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: AssessmentType;

  maxAttempts?: number | null;

  attemptsUsed: number;
  attemptsRemaining?: number | null;

  attempts: AssessmentHistoryItem[];

  serverNow: ISODateString;
};

export type AssessmentAttemptResultAnswer = {
  questionId: string;

  questionText: string;
  questionType: AssessmentQuestionType;

  points: number;
  pointsEarned?: number | null;

  learnerAnswer?: string | null;
  isCorrect?: boolean | null;

  correctAnswer?: string | null;
  explanation?: string | null;
};

export type AssessmentAttemptResultProjectSubmission = {
  submissionId: string;

  status: ProjectSubmissionStatus;

  githubUrl?: string | null;
  deployUrl?: string | null;
  documentUrl?: string | null;
  note?: string | null;

  score?: number | null;
  feedback?: string | null;

  submittedAt: ISODateString;
  gradedAt?: ISODateString | null;
};

export type AssessmentAttemptResult = {
  attemptId: string;
  assessmentId: string;

  assessmentTitle: string;
  assessmentType: AssessmentType;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  score?: number | null;
  maxScore?: number | null;
  passed: boolean;

  startedAt: ISODateString;
  submittedAt?: ISODateString | null;

  canRetake: boolean;
  canReview: boolean;

  answers?: AssessmentAttemptResultAnswer[];

  projectSubmission?: AssessmentAttemptResultProjectSubmission | null;

  serverNow: ISODateString;
};

// -----------------------------------------------------------------------------
// Project submission types
// -----------------------------------------------------------------------------

export type SubmitProjectInput = {
  githubUrl?: string;
  deployUrl?: string;
  documentUrl?: string;
  note?: string;
};

export type SubmitProjectResponse = {
  submissionId: string;
  attemptId: string;

  status: ProjectSubmissionStatus;

  githubUrl?: string | null;
  deployUrl?: string | null;
  documentUrl?: string | null;
  note?: string | null;

  submittedAt: ISODateString;

  score?: number | null;
  feedback?: string | null;
  gradedAt?: ISODateString | null;

  serverNow: ISODateString;
};
