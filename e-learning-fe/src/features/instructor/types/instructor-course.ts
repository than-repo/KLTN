export type CourseLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCE"
  | "ALL_LEVELS";

export type MediaType = "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "OTHER";

export type SortDirection = "asc" | "desc";

export type PaginationMeta = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type InstructorCourse = {
  certificateEnabled: boolean;
  categories?: { id: string; name: string; slug?: string }[];
  createdAt?: string;
  description?: string | null;
  durationInMinutes?: number | null;
  id: string;
  isActive?: boolean;
  language?: string | null;
  level: CourseLevel;
  price?: number | null;
  publishedAt?: string | null;
  requirements?: string[];
  shortDescription: string;
  slug?: string;
  status?: string;
  thumbnailUrl?: string | null;
  title: string;
  updatedAt?: string;
  whatYouWillLearn?: string[];
};

export type InstructorCourseLatestReview = {
  courseId: string;
  courseStatus: string;
  reviewId: string;
  reviewNote?: string | null;
  reviewStatus: string;
  reviewedAt?: string | null;
  submittedAt: string;
};

export type Lesson = {
  description?: string | null;
  id: string;
  isActive: boolean;
  lessonIndex: number;
  sectionId: string;
  title: string;
};

export type Section = {
  courseId: string;
  description?: string | null;
  id: string;
  isActive: boolean;
  lessons?: Lesson[];
  sectionIndex: number;
  title: string;
};

export type CreateCoursePayload = {
  categoryIds: string[];
  certificateEnabled?: boolean;
  description?: string;
  language?: string;
  level: CourseLevel;
  price?: number;
  requirements?: string[];
  shortDescription: string;
  title: string;
  whatYouWillLearn?: string[];
};

export type UpdateCoursePayload = Partial<CreateCoursePayload> & {
  thumbnailUrl?: string;
};

export type CreateSectionPayload = {
  description?: string;
  title: string;
};

export type UpdateSectionPayload = {
  description?: string | null;
  title?: string;
};

export type CreateLessonPayload = {
  description?: string | null;
  title: string;
};

export type UpdateLessonPayload = {
  description?: string | null;
  isActive?: boolean;
  title?: string;
};

export type SectionQuery = {
  includeDeleted?: boolean;
  isActive?: boolean;
  limit?: number;
  page?: number;
  search?: string;
  sortDirection?: SortDirection;
  sortField?: "title" | "sectionIndex" | "createdAt" | "updatedAt";
};

export type LessonQuery = {
  isActive?: boolean;
  limit?: number;
  page?: number;
  search?: string;
  sortDirection?: SortDirection;
  sortField?: "title" | "lessonIndex" | "createdAt" | "updatedAt";
};

export type FileMediaSortField =
  | "filename"
  | "type"
  | "sizeInBytes"
  | "createdAt"
  | "updatedAt";

export type FileMediaQuery = {
  limit?: number;
  mimeType?: number | string;
  page?: number;
  search?: string;
  sortDirection?: SortDirection;
  sortField?: FileMediaSortField;
  type?: MediaType;
};

export type CreateLessonFilePayload = {
  cloudinaryPublicId?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  sizeInBytes?: number | null;
  type: MediaType;
  url: string;
};

export type UpdateLessonFilePayload = Partial<CreateLessonFilePayload>;

export type LessonFileMedia = {
  cloudinaryPublicId?: string | null;
  createdAt?: string;
  filename?: string | null;
  id: string;
  lessonId: string;
  mimeType?: string | null;
  sizeInBytes?: number | null;
  type: MediaType;
  updatedAt?: string;
  url: string;
};

export type UploadSignaturePayload = {
  entityId: string;
  entityType: "course" | "lecture" | "lesson" | "post" | "user" | "document";
  publicId?: string;
  resourceType: "image" | "video" | "raw";
  subFolder?: string;
};

export type UploadSignatureResponse = {
  apiKey: string;
  cloudName: string;
  folder?: string;
  resourceType: "image" | "video" | "raw";
  signature: string;
  timestamp: number;
  uploadPreset?: string;
};

export type InstructorCoursesResponse = {
  data: InstructorCourse[];
  meta: PaginationMeta;
};
