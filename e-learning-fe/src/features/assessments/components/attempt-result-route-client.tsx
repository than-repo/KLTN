"use client";

import Link from "next/link";

import { useAuth } from "@/features/auth/hooks/use-auth";

import { AttemptResult } from "./attempt-result";

type AttemptResultRouteClientProps = {
  assessmentId: string;
  attemptId: string;
  courseId: string;
  courseSlug: string;
};

export function AttemptResultRouteClient({
  assessmentId,
  attemptId,
  courseId,
  courseSlug,
}: AttemptResultRouteClientProps) {
  const { accessToken } = useAuth();

  if (!accessToken) {
    return (
      <main className="min-h-screen bg-surface-pearl px-4 py-10 text-foreground sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-lg border border-border bg-card px-5 py-14 text-center shadow-sm">
          <p className="text-sm font-semibold text-primary">Result locked</p>

          <h1 className="mt-2 text-2xl font-semibold leading-tight">
            Please sign in to view this result.
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Your session is required to load your score, review, and submission
            result.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
              href="/login"
            >
              Go to login
            </Link>

            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              href={`/courses/${courseSlug}/learn?assessment=${encodeURIComponent(
                assessmentId,
              )}`}
            >
              Back to assessment
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-pearl px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <AttemptResult
          accessToken={accessToken}
          assessmentId={assessmentId}
          attemptId={attemptId}
          courseId={courseId}
          courseSlug={courseSlug}
        />
      </div>
    </main>
  );
}
