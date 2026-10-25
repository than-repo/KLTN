import { apiRequest } from "@/lib/api/client";

import type {
  AdminUser,
  AdminUserQuery,
  AdminUsersResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from "../types/admin-user";
import { buildQueryString, unwrapList, unwrapMeta } from "./admin-query";

export async function getAdminUsers(
  query: AdminUserQuery,
  accessToken: string,
): Promise<AdminUsersResponse> {
  const payload = await apiRequest<unknown>(
    `/admin/users${buildQueryString(query)}`,
    { accessToken, method: "GET" },
  );

  return {
    data: unwrapList<AdminUser>(payload),
    meta: unwrapMeta(payload),
  };
}

export function createAdminUser(
  payload: CreateAdminUserPayload,
  accessToken: string,
) {
  return apiRequest<AdminUser>("/admin/users", {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function updateAdminUser(
  userId: string,
  payload: UpdateAdminUserPayload,
  accessToken: string,
) {
  return apiRequest<AdminUser>(`/admin/users/${userId}`, {
    accessToken,
    body: payload,
    method: "PATCH",
  });
}

export function deleteAdminUser(userId: string, accessToken: string) {
  return apiRequest<void>(`/admin/users/${userId}`, {
    accessToken,
    method: "DELETE",
  });
}
