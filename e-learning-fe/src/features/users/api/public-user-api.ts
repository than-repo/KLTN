import { apiRequest } from "@/lib/api/client";

import type { PublicUserProfile } from "../types/public-user";

export function getPublicUserProfile(userId: string) {
  return apiRequest<PublicUserProfile>(`/users/${encodeURIComponent(userId)}`, {
    method: "GET",
    timeoutMs: 10000,
  });
}
