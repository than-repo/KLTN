"use client";

import Link from "next/link";

import { useAuth } from "@/features/auth/hooks/use-auth";

import { AssessmentAttemptPage } from "./assessment-attempt-page";
import { AssessmentAttemptPageV2 } from "./assessment-attempt-page-v2";
type AssessmentAttemptRouteClientProps = {
  assessmentId: string;
  attemptId: string;
  courseId: string;
  courseSlug: string;
};

export function AssessmentAttemptRouteClient({
  assessmentId,
  attemptId,
  courseId,
  courseSlug,
}: AssessmentAttemptRouteClientProps) {
  const { accessToken } = useAuth();

  if (!accessToken) {
    return (
      <main className="min-h-screen bg-surface-pearl px-4 py-10 text-foreground sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-lg border border-border bg-card px-5 py-14 text-center shadow-sm">
          <p className="text-sm font-semibold text-primary">
            Assessment locked
          </p>

          <h1 className="mt-2 text-2xl font-semibold leading-tight">
            Please sign in to continue this attempt.
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Your session is required to load questions, save answers, and submit
            your assessment.
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
              href={`/courses/${courseSlug}/learn`}
            >
              Back to course
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-pearl px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <AssessmentAttemptPageV2
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
