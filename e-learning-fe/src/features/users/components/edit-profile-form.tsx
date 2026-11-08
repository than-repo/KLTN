"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";

import {
  getAvatarUploadSignature,
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
} from "../api/profile-api";
import type {
  ProfileGender,
  UpdateProfileInput,
  UserProfile,
} from "../types/profile";

const inputClasses =
  "mt-2 h-12 w-full rounded-xl border border-[#d9d9d9] bg-white px-4 text-base text-[#1f1f1f] outline-none transition focus:border-[#0056d2] focus:ring-2 focus:ring-[#0056d2]/10";

const sectionClasses =
  "rounded-3xl border border-[#d9d9d9] bg-white p-6 shadow-sm";

const primaryButtonClasses =
  "inline-flex h-12 items-center justify-center rounded-xl bg-[#0056d2] px-6 text-base font-semibold text-white transition hover:bg-[#00419e] disabled:cursor-not-allowed disabled:bg-[#9fb1cf] disabled:hover:bg-[#9fb1cf] disabled:opacity-60";

const secondaryButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-xl border border-[#d9d9d9] bg-white px-4 text-sm font-semibold text-[#111827] transition hover:bg-[#f7f7f7]";

const genderOptions: Array<{ label: string; value: ProfileGender }> = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

type ProfileFormState = {
  avatarUrl: string;
  dateOfBirth: string;
  fullName: string;
  gender: "" | ProfileGender;
  phoneNumber: string;
};

type PendingAvatar = {
  file: File;
  previewUrl: string;
};

const emptyFormState: ProfileFormState = {
  avatarUrl: "",
  dateOfBirth: "",
  fullName: "",
  gender: "",
  phoneNumber: "",
};

export function EditProfileForm() {
  const { accessToken, status, updateUser, user } = useAuth();

  const [form, setForm] = useState<ProfileFormState>(emptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar | null>(
    null,
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    const profileAccessToken = accessToken;
    let isMounted = true;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setLoadError(null);

      try {
        const nextProfile = await getMyProfile(profileAccessToken);

        if (!isMounted) {
          return;
        }

        setProfile(nextProfile);
        setForm(toFormState(nextProfile));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load your profile.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [accessToken, retryCount, status]);

  useEffect(() => {
    if (!pendingAvatar) {
      return;
    }

    return () => URL.revokeObjectURL(pendingAvatar.previewUrl);
  }, [pendingAvatar]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  function updateField<Field extends keyof ProfileFormState>(
    field: Field,
    value: ProfileFormState[Field],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setFormError("Your session is not ready. Please sign in again.");
      return;
    }

    const validationError = validateForm(form);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      let avatarUrl = form.avatarUrl.trim();

      if (pendingAvatar) {
        setIsUploadingAvatar(true);
        const userId = profile?.id ?? user?.id;

        if (!userId) {
          throw new Error(
            "Unable to identify your account. Please sign in again.",
          );
        }

        const signature = await getAvatarUploadSignature(userId, accessToken);
        avatarUrl = await uploadAvatar(pendingAvatar.file, signature);
      }

      const updatedProfile = await updateMyProfile(
        accessToken,
        toUpdateProfileInput({ ...form, avatarUrl }),
      );

      setProfile(updatedProfile);
      setForm(toFormState(updatedProfile));
      setPendingAvatar(null);
      updateUser(updatedProfile);
      setSuccessMessage("Your profile has been updated successfully.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update your profile.",
      );
    } finally {
      setIsSubmitting(false);
      setIsUploadingAvatar(false);
    }
  }

  function handleAvatarSelected(file: File | undefined) {
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("Please choose an image file.");
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
      return;
    }

    setPendingAvatar({
      file,
      previewUrl: URL.createObjectURL(file),
    });
    setFormError(null);
    setSuccessMessage(null);
  }

  if (isLoadingProfile) {
    return (
      <div className="rounded-3xl border border-[#d9d9d9] bg-white px-5 py-14 text-center text-sm text-[#5b6780]">
        Loading your profile...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-[#d9d9d9] bg-white px-5 py-14 text-center">
        <p className="text-lg font-semibold text-[#111827]">
          Profile could not be loaded
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#5b6780]">
          {loadError}
        </p>

        <button
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#0056d2] px-5 text-sm font-semibold text-white transition hover:bg-[#00419e]"
          onClick={() => setRetryCount((currentCount) => currentCount + 1)}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }
  const displayProfile = profile ?? user;
  const displayName =
    form.fullName.trim() || displayProfile?.fullName || "User";

  const avatarSrc = pendingAvatar?.previewUrl ?? form.avatarUrl.trim();
  const hasChanges =
    profile !== null &&
    (pendingAvatar !== null ||
      !areProfileFormsEqual(form, toFormState(profile)));

  return (
    <>
      {successMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 top-6 z-50 w-[calc(100%-3rem)] max-w-sm rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-lg"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Changes saved
              </p>
              <p className="mt-1 text-sm text-slate-600">{successMessage}</p>
            </div>

            <button
              type="button"
              aria-label="Dismiss notification"
              className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              onClick={() => setSuccessMessage(null)}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <section className={sectionClasses}>
          <h2 className="text-xl font-semibold text-[#1f1f1f]">
            Personal information
          </h2>
          <p className="mt-1 text-sm text-[#344563]">
            Update your personal details and how others see you.
          </p>

          <div className="mt-8 grid gap-x-5 gap-y-6 md:grid-cols-2">
            <div>
              <label
                className="text-sm font-semibold text-[#111827]"
                htmlFor="fullName"
              >
                Full name
              </label>
              <input
                autoComplete="name"
                className={inputClasses}
                id="fullName"
                maxLength={100}
                minLength={2}
                name="fullName"
                onChange={(event) =>
                  updateField("fullName", event.target.value)
                }
                required
                type="text"
                value={form.fullName}
              />
            </div>

            <div>
              <label
                className="text-sm font-semibold text-[#111827]"
                htmlFor="phoneNumber"
              >
                Phone number
              </label>
              <input
                autoComplete="tel"
                className={inputClasses}
                id="phoneNumber"
                name="phoneNumber"
                onChange={(event) =>
                  updateField("phoneNumber", event.target.value)
                }
                placeholder="Not added"
                type="tel"
                value={form.phoneNumber}
              />
            </div>

            <div>
              <label
                className="text-sm font-semibold text-[#111827]"
                htmlFor="dateOfBirth"
              >
                Date of birth
              </label>
              <input
                className={inputClasses}
                id="dateOfBirth"
                name="dateOfBirth"
                onChange={(event) =>
                  updateField("dateOfBirth", event.target.value)
                }
                type="date"
                value={form.dateOfBirth}
              />
            </div>

            <div>
              <label
                className="text-sm font-semibold text-[#111827]"
                htmlFor="gender"
              >
                Gender
              </label>
              <select
                className={inputClasses}
                id="gender"
                name="gender"
                onChange={(event) =>
                  updateField(
                    "gender",
                    event.target.value as ProfileFormState["gender"],
                  )
                }
                value={form.gender}
              >
                <option value="">Not specified</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError ? (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {formError}
            </p>
          ) : null}

          <div className="mt-6">
            <button
              className={primaryButtonClasses}
              disabled={!hasChanges || isSubmitting || isUploadingAvatar}
              type="submit"
            >
              {isUploadingAvatar
                ? "Uploading photo..."
                : isSubmitting
                  ? "Saving..."
                  : "Save Changes"}
            </button>
          </div>
        </section>

        <section className={sectionClasses}>
          <h2 className="text-xl font-semibold text-[#1f1f1f]">
            Profile photo
          </h2>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
            {avatarSrc ? (
              <Image
                alt={`${displayName} profile photo`}
                className="h-16 w-16 shrink-0 rounded-full border border-[#d9d9d9] object-cover"
                height={64}
                src={avatarSrc}
                unoptimized
                width={64}
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#d9d9d9] bg-[#eaf2ff] text-xl font-semibold text-[#0056d2]">
                {getInitial(displayName)}
              </div>
            )}

            <div className="flex-1">
              <p className="text-sm text-[#344563]">
                Choose an image from your device. Your photo is uploaded
                securely when you save your changes.
              </p>

              <input
                accept="image/*"
                className="sr-only"
                onChange={(event) =>
                  handleAvatarSelected(event.target.files?.[0])
                }
                ref={avatarInputRef}
                type="file"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className={secondaryButtonClasses}
                  onClick={() => avatarInputRef.current?.click()}
                  type="button"
                >
                  Choose photo
                </button>
                {avatarSrc ? (
                  <button
                    className={secondaryButtonClasses}
                    onClick={() => {
                      setPendingAvatar(null);
                      updateField("avatarUrl", "");
                      if (avatarInputRef.current) {
                        avatarInputRef.current.value = "";
                      }
                    }}
                    type="button"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>

              <div className="mt-6">
                <button
                  className={primaryButtonClasses}
                  disabled={!hasChanges || isSubmitting || isUploadingAvatar}
                  type="submit"
                >
                  {isUploadingAvatar
                    ? "Uploading photo..."
                    : isSubmitting
                      ? "Saving..."
                      : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={sectionClasses}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#1f1f1f]">
                Account information
              </h2>
              <p className="mt-1 text-sm text-[#344563]">
                These details are used to secure and identify your account.
              </p>
            </div>

            <div className="grid gap-4 sm:min-w-[340px]">
              <InfoItem
                label="Email address"
                value={displayProfile?.email ?? "Not available"}
              />
              <InfoItem
                label="Role"
                value={formatRole(
                  displayProfile && "role" in displayProfile
                    ? String(displayProfile.role)
                    : undefined,
                )}
              />
              <InfoItem
                label="Email verified"
                value={profile?.emailVerified ? "Yes" : "No"}
              />
              <InfoItem
                label="Last login"
                value={formatNullableDate(profile?.lastLoginAt)}
              />
            </div>
          </div>
        </section>
      </form>
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e6e6e6] pb-3 last:border-b-0 last:pb-0">
      <p className="text-sm font-semibold text-[#344563]">{label}</p>
      <p className="max-w-[190px] truncate text-right text-sm font-semibold text-[#1f1f1f]">
        {value}
      </p>
    </div>
  );
}

function toFormState(profile: UserProfile): ProfileFormState {
  return {
    avatarUrl: profile.avatarUrl ?? "",
    dateOfBirth: toDateInputValue(profile.dateOfBirth),
    fullName: profile.fullName ?? "",
    gender: profile.gender ?? "",
    phoneNumber: profile.phoneNumber ?? "",
  };
}

function toUpdateProfileInput(form: ProfileFormState): UpdateProfileInput {
  return {
    avatarUrl: form.avatarUrl.trim(),
    dateOfBirth: form.dateOfBirth,
    fullName: form.fullName.trim(),
    gender: form.gender || null,
    phoneNumber: form.phoneNumber.trim(),
  };
}

function areProfileFormsEqual(
  first: ProfileFormState,
  second: ProfileFormState,
) {
  return (
    first.avatarUrl.trim() === second.avatarUrl.trim() &&
    first.dateOfBirth === second.dateOfBirth &&
    first.fullName.trim() === second.fullName.trim() &&
    first.gender === second.gender &&
    first.phoneNumber.trim() === second.phoneNumber.trim()
  );
}

function validateForm(form: ProfileFormState) {
  const fullName = form.fullName.trim();

  if (fullName.length < 2 || fullName.length > 100) {
    return "Full name must be between 2 and 100 characters.";
  }

  return null;
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.split("T")[0];
}

function formatNullableDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatRole(role?: string) {
  if (!role) {
    return "User";
  }

  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}
