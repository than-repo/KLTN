import { apiRequest } from "@/lib/api/client";

import type { UpdateProfileInput, UserProfile } from "../types/profile";

type UpdateProfilePayload = {
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  fullName?: string;
  gender?: UpdateProfileInput["gender"];
  phoneNumber?: string | null;
};

export function getMyProfile(accessToken: string) {
  return apiRequest<UserProfile>("/users/me", {
    accessToken,
    method: "GET",
  });
}

export function updateMyProfile(
  accessToken: string,
  input: UpdateProfileInput,
) {
  return apiRequest<UserProfile>("/users/me", {
    accessToken,
    body: normalizeUpdateProfileInput(input),
    method: "PATCH",
  });
}

export function normalizeUpdateProfileInput(
  input: UpdateProfileInput,
): UpdateProfilePayload {
  const payload: UpdateProfilePayload = {};

  if ("fullName" in input) {
    payload.fullName = input.fullName?.trim();
  }

  if ("phoneNumber" in input) {
    payload.phoneNumber = normalizeNullableString(input.phoneNumber);
  }

  if ("dateOfBirth" in input) {
    payload.dateOfBirth = normalizeDateString(input.dateOfBirth);
  }

  if ("gender" in input) {
    payload.gender = input.gender ?? null;
  }

  if ("avatarUrl" in input) {
    payload.avatarUrl = normalizeNullableString(input.avatarUrl);
  }

  return payload;
}

function normalizeNullableString(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeDateString(value: string | null | undefined) {
  const normalizedValue = normalizeNullableString(value);

  if (!normalizedValue) {
    return normalizedValue;
  }

  return normalizedValue.split("T")[0];
}
