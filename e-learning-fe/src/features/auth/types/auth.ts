export type UserRole = "LEARNER" | "INSTRUCTOR" | "REVIEWER" | "ADMIN";

export type AuthUser = {
  email: string;
  fullName: string;
  id: string;
  role: UserRole;
};

export type CurrentUser = AuthUser & {
  avatarUrl?: string | null;
  createdAt?: string;
  dateOfBirth?: string | null;
  emailVerified?: boolean;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
  phoneNumber?: string | null;
  updatedAt?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  newPassword: string;
  token: string;
};

export type RegisterInput = LoginInput & {
  fullName: string;
};

export type AuthResponseData = {
  accessToken: string;
  message?: string;
  user: AuthUser;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  message: string;
  accessToken: string;
};
