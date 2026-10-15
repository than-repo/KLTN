export type CourseLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCE"
  | "ALL_LEVELS";

export type CourseSortField =
  | "title"
  | "price"
  | "level"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "publishedAt";

export type SortDirection = "asc" | "desc";

export type CourseCategorySummary = {
  id: string;
  name: string;
  slug: string;
};

export type CourseInstructorSummary = {
  fullName: string;
  id: string;
};

export type PublicCourse = {
  categories?: CourseCategorySummary[];
  certificateEnabled: boolean;
  description?: string | null;
  durationInMinutes?: number | null;
  id: string;
  instructors?: CourseInstructorSummary[];
  language?: string | null;
  level: CourseLevel;
  price?: number | null;
  requirements?: string[] | null;
  shortDescription: string;
  slug: string;
  thumbnailUrl?: string | null;
  title: string;
  whatYouWillLearn?: string[] | null;
};

export type CategoryTreeNode = {
  children: CategoryTreeNode[];
  description: string | null;
  id: string;
  name: string;
  order: number;
  parentId: string | null;
  slug: string;
};

export type PaginationMeta = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type PublicCourseQuery = {
  categoryId?: string | null;
  certificateEnabled?: boolean | null;
  instructorId?: string | null;
  language?: string | null;
  level?: CourseLevel | null;
  limit?: number | null;
  maxPrice?: number | null;
  minPrice?: number | null;
  page?: number | null;
  publishedFrom?: Date | string | null;
  publishedTo?: Date | string | null;
  search?: string | null;
  sortDirection?: SortDirection | null;
  sortField?: CourseSortField | null;
};

export type PaginatedCourses = {
  data: PublicCourse[];
  meta: PaginationMeta;
};
