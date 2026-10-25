export type QueryValue = string | number | boolean | undefined | null;

export type ReviewerCourseStatus =
  | "PENDING"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | string;

export type ReviewDecisionStatus =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

export type ReviewerCourseCategory = {
  id: string;
  name: string;
  slug?: string | null;
};

export type ReviewerCourseInstructor = {
  id: string;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export type ReviewerCourseSummary = {
  id: string;
  title: string;
  slug?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  level?: string | null;
  language?: string | null;
  price?: number | null;
  status?: string;
  categories?: ReviewerCourseCategory[];
  instructors?: ReviewerCourseInstructor[];
};

export type ReviewerCourseTask = {
  reviewId: string;
  reviewStatus: ReviewerCourseStatus;
  reviewNote?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  course: ReviewerCourseSummary;
};

export type PaginationMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta?: PaginationMeta;
};

export type ClaimCourseReviewResponse = {
  message?: string;
  reviewId?: string;
};

export type SubmitCourseReviewDecisionPayload = {
  decision: ReviewDecisionStatus;
  note: string;
};

export type SubmitCourseReviewDecisionResponse = {
  message?: string;
  reviewId?: string;
  reviewStatus?: ReviewerCourseStatus;
};

export type ReviewerFileMedia = {
  id: string;
  lessonId: string;
  cloudinaryPublicId?: string | null;
  url: string;
  type: string;
  filename?: string | null;
  mimeType?: string | null;
  sizeInBytes?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewerLesson = {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  lessonIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  files: ReviewerFileMedia[];
};

export type ReviewerSection = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  sectionIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lessons: ReviewerLesson[];
};

export type ReviewerReviewCourse = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description?: string | null;
  whatYouWillLearn?: string[] | null;
  requirements?: string[] | null;
  thumbnailUrl?: string | null;
  level: string;
  price?: number | null;
  language?: string | null;
  durationInMinutes?: number | null;
  certificateEnabled: boolean;
  status: string;
  isActive: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  categories: ReviewerCourseCategory[];
  instructors: ReviewerCourseInstructor[];
  sections: ReviewerSection[];
};

export type ReviewerCourseReviewWorkspace = {
  reviewId: string;
  reviewStatus: ReviewerCourseStatus;
  reviewNote?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  course: ReviewerReviewCourse;
};
