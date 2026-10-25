import { apiRequest } from "@/lib/api/client";

import type {
  AdminCategoriesResponse,
  AdminCategoryQuery,
  AdminCourseCategory,
  CreateAdminCategoryPayload,
  UpdateAdminCategoryPayload,
} from "../types/admin-category";
import { buildQueryString } from "./admin-query";

export function normalizeAdminCategory(
  category: AdminCourseCategory,
): AdminCourseCategory {
  return {
    ...category,
    isActive:
      category.isActive === true ||
      category.isActive === (1 as unknown as boolean) ||
      category.isActive === ("1" as unknown as boolean) ||
      category.isActive === ("true" as unknown as boolean),
  };
}

export function getAdminCategories(
  query: AdminCategoryQuery,
  accessToken: string,
) {
  return apiRequest<AdminCategoriesResponse>(
    `/admin/courses/categories${buildQueryString(toCategoryQuery(query))}`,
    { accessToken, method: "GET" },
  );
}

export function createAdminCategory(
  payload: CreateAdminCategoryPayload,
  accessToken: string,
) {
  return apiRequest<AdminCourseCategory>("/admin/courses/categories", {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function updateAdminCategory(
  categoryId: string,
  payload: UpdateAdminCategoryPayload,
  accessToken: string,
) {
  return apiRequest<AdminCourseCategory>(
    `/admin/courses/categories/${categoryId}`,
    { accessToken, body: payload, method: "PATCH" },
  );
}

export function softDeleteAdminCategory(
  categoryId: string,
  accessToken: string,
) {
  return apiRequest<AdminCourseCategory>(
    `/admin/courses/categories/${categoryId}/soft-delete`,
    { accessToken, method: "PATCH" },
  );
}

export function restoreAdminCategory(categoryId: string, accessToken: string) {
  return apiRequest<AdminCourseCategory>(
    `/admin/courses/categories/${categoryId}/restore`,
    { accessToken, method: "PATCH" },
  );
}

export function updateAdminCategoryActiveStatus(
  categoryId: string,
  isActive: boolean,
  accessToken: string,
) {
  return apiRequest<AdminCourseCategory>(
    `/admin/courses/categories/${categoryId}/active-status`,
    { accessToken, body: { isActive }, method: "PATCH" },
  );
}

function toCategoryQuery(query: AdminCategoryQuery) {
  return {
    includeDeleted: query.includeDeleted ? "true" : undefined,
    isActive:
      query.isActive === undefined
        ? undefined
        : query.isActive
          ? "true"
          : "false",
    limit: query.limit,
    page: query.page,
    search: query.search?.trim() ? query.search.trim() : undefined,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
}
