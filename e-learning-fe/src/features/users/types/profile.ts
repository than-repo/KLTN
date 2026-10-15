import type { CurrentUser } from "@/features/auth/types/auth";

export type UserProfile = CurrentUser;

export type ProfileGender = NonNullable<CurrentUser["gender"]>;

export type UpdateProfileInput = {
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  fullName?: string;
  gender?: ProfileGender | null;
  phoneNumber?: string | null;
};
