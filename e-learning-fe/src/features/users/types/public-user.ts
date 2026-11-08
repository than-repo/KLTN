import type { CurrentUser, UserRole } from "@/features/auth/types/auth";

export type PublicUserProfile = {
  avatarUrl?: string | null;
  createdAt: string;
  fullName: string;
  gender?: NonNullable<CurrentUser["gender"]> | null;
  id: string;
  role: UserRole;
};
