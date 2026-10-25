export type AdminRole = "ADMIN" | "INSTRUCTOR" | "LEARNER" | "REVIEWER";

export type AdminGender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type AdminUser = {
  avatarUrl?: string | null;
  createdAt?: string;
  dateOfBirth?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  fullName?: string | null;
  gender?: AdminGender | null;
  id: string;
  isActive?: boolean;
  lastLoginAt?: string | null;
  phoneNumber?: string | null;
  role?: AdminRole;
  updatedAt?: string;
};

export type AdminUserQuery = {
  limit?: number;
  page?: number;
  search?: string;
};

export type CreateAdminUserPayload = {
  avatarUrl?: string;
  dateOfBirth?: string;
  email: string;
  fullName: string;
  gender?: AdminGender;
  password: string;
  phoneNumber?: string;
  role: AdminRole;
};

export type UpdateAdminUserPayload = {
  avatarUrl?: string;
  dateOfBirth?: string;
  email?: string;
  emailVerified?: boolean;
  fullName?: string;
  gender?: AdminGender;
  isActive?: boolean;
  password?: string;
  phoneNumber?: string;
  role?: AdminRole;
};

export type AdminUsersResponse = {
  data: AdminUser[];
  meta: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
};

export const adminRoleOptions: AdminRole[] = [
  "ADMIN",
  "INSTRUCTOR",
  "LEARNER",
  "REVIEWER",
];

export const adminGenderOptions: AdminGender[] = [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
];
