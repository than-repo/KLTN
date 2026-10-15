import { apiRequest } from "@/lib/api/client";

import type {
  CategoryTreeNode,
  PaginatedCourses,
  PublicCourse,
  PublicCourseQuery,
} from "../types/course";
import { buildPublicCourseQueryString } from "../utils/course-data";

const paymentDevHeaders: HeadersInit = { "ngrok-skip-browser-warning": "true" };

export function getPublicCourses(query?: PublicCourseQuery) {
  return apiRequest<PaginatedCourses>(
    `/courses/public${buildPublicCourseQueryString(query)}`,
    {
      method: "GET",
      timeoutMs: 10000,
    },
  );
}

export function getPublicCourseBySlug(slug: string) {
  return apiRequest<PublicCourse>(
    `/courses/public/${encodeURIComponent(slug)}`,
    {
      method: "GET",
      headers: paymentDevHeaders,
    },
  );
}

export function getPublicCategoryTree() {
  return apiRequest<CategoryTreeNode[]>("/courses/public/category-tree", {
    method: "GET",
    timeoutMs: 10000,
  });
}
