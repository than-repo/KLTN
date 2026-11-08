import { apiRequest } from "@/lib/api/client";

import type { UpdateProfileInput, UserProfile } from "../types/profile";

type AvatarUploadSignature = {
  apiKey: string;
  cloudName: string;
  folder?: string;
  signature: string;
  timestamp: number | string;
  uploadPreset?: string;
};

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

export function getAvatarUploadSignature(userId: string, accessToken: string) {
  return apiRequest<AvatarUploadSignature>("/upload/signature", {
    accessToken,
    body: {
      entityId: userId,
      entityType: "user",
      resourceType: "image",
      subFolder: "avatar",
    },
    method: "POST",
  });
}

export async function uploadAvatar(
  file: File,
  signature: AvatarUploadSignature,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);

  if (signature.folder) {
    formData.append("folder", signature.folder);
  }

  if (signature.uploadPreset) {
    formData.append("upload_preset", signature.uploadPreset);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { body: formData, method: "POST" },
  );
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    secure_url?: string;
  } | null;

  if (!response.ok || !payload?.secure_url) {
    throw new Error(
      payload?.error?.message ??
        "Profile photo upload failed. Please try again.",
    );
  }

  return payload.secure_url;
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
