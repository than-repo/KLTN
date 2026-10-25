import { apiRequest } from "@/lib/api/client";

import type { AdminUserQuery } from "../types/admin-user";
import type {
  ReplaceReviewerCategoryAuthorizationsPayload,
  ReviewerCategoryAuthorizations,
} from "../types/admin-reviewer-category";
import { buildQueryString } from "./admin-query";

export function getAdminReviewers(query: AdminUserQuery, accessToken: string) {
  return apiRequest<unknown>(
    `/admin/users${buildQueryString({ limit: 100, role: "REVIEWER", ...query })}`,
    { accessToken, method: "GET" },
  );
}

export function getAdminReviewerCategories(
  reviewerId: string,
  accessToken: string,
) {
  return apiRequest<ReviewerCategoryAuthorizations>(
    `/admin/courses/reviewers/${reviewerId}/categories`,
    { accessToken, method: "GET" },
  );
}

export function replaceAdminReviewerCategories(
  reviewerId: string,
  payload: ReplaceReviewerCategoryAuthorizationsPayload,
  accessToken: string,
) {
  return apiRequest<ReviewerCategoryAuthorizations>(
    `/admin/courses/reviewers/${reviewerId}/categories`,
    { accessToken, body: payload, method: "PUT" },
  );
}
