import Image from "next/image";

import type { UserRole } from "@/features/auth/types/auth";
import type { PublicUserProfile } from "../types/public-user";

type PublicUserProfileProps = {
  profile: PublicUserProfile;
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrator",
  INSTRUCTOR: "Instructor",
  LEARNER: "Learner",
  REVIEWER: "Course reviewer",
};

const genderLabels: Record<NonNullable<PublicUserProfile["gender"]>, string> = {
  FEMALE: "Female",
  MALE: "Male",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export function PublicUserProfileView({ profile }: PublicUserProfileProps) {
  const memberSince = formatDate(profile.createdAt);
  const initial = profile.fullName.trim().charAt(0).toUpperCase() || "U";

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div
        aria-hidden="true"
        className="h-36 bg-gradient-to-r from-[#172554] via-[#1d4ed8] to-[#38bdf8] sm:h-48"
      />

      <div className="px-5 pb-8 sm:px-8 sm:pb-10">
        <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {profile.avatarUrl ? (
              <Image
                alt={`${profile.fullName}'s profile picture`}
                className="size-28 rounded-full border-4 border-card bg-muted object-cover sm:size-32"
                height={128}
                src={profile.avatarUrl}
                unoptimized
                width={128}
              />
            ) : (
              <div
                aria-label={`${profile.fullName}'s profile picture`}
                className="grid size-28 place-items-center rounded-full border-4 border-card bg-primary text-4xl font-semibold text-primary-foreground sm:size-32"
                role="img"
              >
                {initial}
              </div>
            )}

            <div className="pb-1">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {profile.fullName}
              </h1>
            </div>
          </div>

          <span className="w-fit rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
            {roleLabels[profile.role]}
          </span>
        </div>

        <section
          aria-labelledby="profile-details-heading"
          className="mt-9 border-t border-border pt-7"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className="text-xl font-semibold"
                id="profile-details-heading"
              >
                About
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Public information shared by this member.
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <ProfileDetail
              label="Gender"
              value={
                profile.gender ? genderLabels[profile.gender] : "Not provided"
              }
            />
            <div className="rounded-xl border border-border bg-surface-pearl p-4">
              <dt className="text-sm text-muted-foreground">Member since</dt>
              <dd className="mt-1 font-medium">
                <time dateTime={profile.createdAt}>{memberSince}</time>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </article>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-pearl p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
