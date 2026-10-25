"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

import { getReviewerReviewWorkspace } from "@/features/reviewer/api/reviewer-api";
import type { ReviewerCourseReviewWorkspace } from "@/features/reviewer/types/reviewer";

type PreviewLesson = {
  id: string;
  title: string;
  description?: string | null;
};

type PreviewSection = {
  id: string;
  title: string;
  description?: string | null;
  lessons: PreviewLesson[];
};

type PreviewCourse = {
  id: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  level?: string | null;
  language?: string | null;
  certificateEnabled: boolean;
  sections: PreviewSection[];
};

type RawSection = Record<string, unknown>;
type RawLesson = Record<string, unknown>;

function normalizeReviewerWorkspace(
  payload: ReviewerCourseReviewWorkspace | null,
): PreviewCourse | null {
  if (!payload) return null;

  const rawCourse = payload.course ?? payload;

  const rawSections = rawCourse.sections ?? [];

  return {
    id: rawCourse.id ?? "",
    title: rawCourse.title ?? "Untitled course",
    shortDescription: rawCourse.shortDescription ?? null,
    description: rawCourse.description ?? null,
    thumbnailUrl: rawCourse.thumbnailUrl ?? null,
    level: rawCourse.level ?? null,
    language: rawCourse.language ?? null,
    certificateEnabled: Boolean(rawCourse.certificateEnabled),
    sections: rawSections.map((section: RawSection) => {
      const rawLessons = section.lessons ?? [];

      return {
        id: String(section.id ?? ""),
        title: String(section.title ?? ""),
        description: section.description as string | null | undefined,
        lessons: (rawLessons as RawLesson[]).map((lesson: RawLesson) => ({
          id: String(lesson.id ?? ""),
          title: String(lesson.title ?? ""),
          description: lesson.description as string | null | undefined,
        })),
      };
    }),
  };
}

export default function ReviewerCoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken, status } = useAuth();
  const reviewId = String(params.reviewId ?? "");

  const [course, setCourse] = useState<PreviewCourse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(() => {
    if (!reviewId || reviewId === "undefined") {
      setError("Invalid review task id.");
      return;
    }
    if (status !== "authenticated" || !accessToken) return;

    setError(null);
    getReviewerReviewWorkspace(reviewId, accessToken)
      .then((data) => {
        setCourse(
          normalizeReviewerWorkspace(
            data as unknown as ReviewerCourseReviewWorkspace,
          ),
        );
      })
      .catch((err) => {
        const apiError = err as ApiError;
        setError(apiError.message || "Failed to load course preview.");
      });
  }, [reviewId, accessToken, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch must update local state on mount
    loadPreview();
  }, [loadPreview]);

  if (status !== "authenticated") {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">
            Unable to load course preview
          </h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.push(`/reviewer/courses/${reviewId}`)}

            >
              Back to Review Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/reviewer/courses/${reviewId}`)}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            ← Back to Review Workspace
          </button>
        </div>

        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            {course.title || "Untitled course"}
          </h2>
          {course.shortDescription && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {course.shortDescription}
            </p>
          )}
          {course.description && (
            <div className="mt-4 rounded-lg border bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase text-zinc-500 mb-1">
                Description
              </p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                {course.description}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-2 text-xs text-muted-foreground">
            <span>Level: {course.level || "-"}</span>
            <span>Language: {course.language || "-"}</span>
            <span>
              Certificate: {course.certificateEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Curriculum ({course.sections.length})
            </h3>
            <div className="space-y-3">
              {course.sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-lg border border-border bg-white p-4"
                >
                  <h4 className="font-medium text-foreground mb-2">
                    {section.title}
                  </h4>
                  {section.description && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  )}
                  <div className="space-y-1">
                    {section.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-start gap-2">
                        <span className="shrink-0 mt-0.5 text-xs text-muted-foreground">
                          •
                        </span>
                        <p className="text-sm text-zinc-700">{lesson.title}</p>
                        {lesson.description && (
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => router.push(`/reviewer/courses/${reviewId}`)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Go to Decision
            </button>
          </div>
        </article>
      </div>
    </main>
  );
}
