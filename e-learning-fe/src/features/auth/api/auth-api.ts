import { apiRequest } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/config/env";

import type {
  AuthResponseData,
  ChangePasswordInput,
  ChangePasswordResponse,
  CurrentUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../types/auth";

export function login(input: LoginInput) {
  return apiRequest<AuthResponseData>("/auth/login", {
    body: input,
    method: "POST",
  });
}

export function register(input: RegisterInput) {
  return apiRequest<AuthResponseData>("/auth/register", {
    body: input,
    method: "POST",
  });
}

export function getGoogleLoginUrl() {
  return `${getApiBaseUrl()}/auth/google`;
}

export function forgotPassword(input: ForgotPasswordInput) {
  return apiRequest<{ message: string }>("/auth/forgot-password", {
    body: input,
    method: "POST",
  });
}

export function resetPassword(input: ResetPasswordInput) {
  return apiRequest<{ message: string }>("/auth/reset-password", {
    body: input,
    method: "POST",
  });
}

export function refreshSession() {
  return apiRequest<AuthResponseData>("/auth/refresh", {
    method: "POST",
    timeoutMs: 5000,
  });
}

export function logout() {
  return apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

export function logoutAll(accessToken: string) {
  return apiRequest<{ message: string }>("/auth/logout-all", {
    accessToken,
    method: "POST",
  });
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<CurrentUser>("/users/me", {
    accessToken,
    method: "GET",
  });
}

export function changePassword(
  accessToken: string,
  passwords: ChangePasswordInput,
) {
  return apiRequest<ChangePasswordResponse>("/auth/change-password", {
    accessToken,
    body: passwords,
    method: "PATCH",
  });
}
