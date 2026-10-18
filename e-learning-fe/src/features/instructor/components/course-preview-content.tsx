"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";

import {
  getInstructorCourseSections,
  getInstructorCourses,
  submitInstructorCourseForReview,
} from "../api/instructor-course-api";
import { getInstructorCourseLessons } from "../api/instructor-lesson-api";
import { getInstructorLessonFiles } from "../api/instructor-lesson-file-api";
import type {
  InstructorCourse,
  LessonFileMedia,
  Section,
} from "../types/instructor-course";
import {
  canSubmitCourse,
  formatCourseStatusLabel,
  formatLevelLabel,
  getCourseStatusBadgeVariant,
  getSubmitLockedMessage,
} from "../utils/course-status";
import { formatCurrency, getErrorMessage } from "../utils/instructor-format";
import { mediaTypeLabels } from "../utils/lesson-media";
import { InstructorModal } from "./instructor-modal";

type CoursePreviewContentProps = {
  courseId: string;
};

export function CoursePreviewContent({ courseId }: CoursePreviewContentProps) {
  const { accessToken, status } = useAuth();

  const [course, setCourse] = useState<InstructorCourse | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [filesByLesson, setFilesByLesson] = useState<
    Record<string, LessonFileMedia[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    variant: "error" | "success";
  } | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    const token = accessToken;
    let isMounted = true;

    async function bootstrap() {
      try {
        const coursesResponse = await getInstructorCourses(
          { limit: 100 },
          token,
        );

        if (!isMounted) return;

        const found =
          (coursesResponse.data ?? []).find((item) => item.id === courseId) ??
          null;

        setCourse(found);

        if (!found) {
          setError("Course not found or no longer available.");
          return;
        }

        const sectionList = await getInstructorCourseSections(
          courseId,
          { limit: 100 },
          token,
        );

        const nextFiles: Record<string, LessonFileMedia[]> = {};

        const sectionsWithLessons = await Promise.all(
          sectionList.map(async (section) => {
            try {
              const lessons = await getInstructorCourseLessons(
                courseId,
                section.id,
                { limit: 100, sortDirection: "asc", sortField: "lessonIndex" },
                token,
              );

              await Promise.all(
                lessons.map(async (lesson) => {
                  try {
                    nextFiles[lesson.id] = await getInstructorLessonFiles(
                      courseId,
                      section.id,
                      lesson.id,
                      { limit: 100, page: 1 },
                      token,
                    );
                  } catch {
                    nextFiles[lesson.id] = [];
                  }
                }),
              );

              return { ...section, lessons };
            } catch {
              return { ...section, lessons: section.lessons ?? [] };
            }
          }),
        );

        setSections(sectionsWithLessons);
        setFilesByLesson(nextFiles);
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Unable to load the preview."));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [accessToken, courseId, status]);

  async function confirmSubmitForReview() {
    if (!course || !accessToken) return;

    try {
      setSubmitting(true);

      await submitInstructorCourseForReview(course.id, accessToken);

      setCourse({ ...course, status: "PENDING_REVIEW" });
      setShowSubmitModal(false);
      setMessage({
        text: "Course submitted for review successfully.",
        variant: "success",
      });
    } catch (submitError) {
      setShowSubmitModal(false);
      setMessage({
        text: getErrorMessage(
          submitError,
          "Failed to submit the course for review.",
        ),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }
  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-40 rounded-lg border border-border bg-card" />
        <div className="h-64 rounded-lg border border-border bg-card" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
        <p className="text-lg font-semibold">Preview unavailable</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {error ?? "Course not found or no longer available."}
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground"
          href="/instructor/courses"
        >
          Back to My Courses
        </Link>
      </div>
    );
  }

  const submitAllowed = canSubmitCourse(course.status);
  const submitLockedMessage = getSubmitLockedMessage(course.status);

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getCourseStatusBadgeVariant(course.status)}>
                {formatCourseStatusLabel(course.status)}
              </Badge>
              <Badge>{formatLevelLabel(course.level)}</Badge>
              {course.language ? <Badge>{course.language}</Badge> : null}
              {course.categories?.map((category) => (
                <Badge key={category.id}>{category.name}</Badge>
              ))}
            </div>
            <h2 className="mt-3 text-2xl font-semibold">{course.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {course.shortDescription}
            </p>
          </div>

          <div className="text-lg font-semibold">
            {course.price !== undefined && course.price !== null
              ? formatCurrency(course.price)
              : "Free"}
          </div>
        </div>

        {message ? (
          <p
            className={`mt-4 rounded-md px-4 py-3 text-sm leading-6 ${
              message.variant === "success"
                ? "border border-success/30 bg-success/10 text-success"
                : "border border-danger/30 bg-danger/10 text-danger"
            }`}
            role={message.variant === "success" ? "status" : "alert"}
          >
            {message.text}
          </p>
        ) : null}

        {!submitAllowed ? (
          <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-warning">
            {submitLockedMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-5">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface-pearl px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
            href={`/instructor/courses/${course.id}/edit`}
          >
            Edit Course
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface-pearl px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
            href={`/instructor/courses/${course.id}/curriculum`}
          >
            Curriculum
          </Link>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!submitAllowed}
            onClick={() => setShowSubmitModal(true)}
            type="button"
          >
            Submit for Review
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">About this course</h3>

        {course.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {course.description}
          </p>
        ) : null}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {course.whatYouWillLearn?.length ? (
            <div>
              <p className="text-sm font-semibold">What you&apos;ll learn</p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                {course.whatYouWillLearn.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {course.requirements?.length ? (
            <div>
              <p className="text-sm font-semibold">Requirements</p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                {course.requirements.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Curriculum preview</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {sections.length} section{sections.length === 1 ? "" : "s"} ·{" "}
          {sections.reduce(
            (sum, section) => sum + (section.lessons?.length ?? 0),
            0,
          )}{" "}
          lesson
          {sections.reduce(
            (sum, section) => sum + (section.lessons?.length ?? 0),
            0,
          ) === 1
            ? ""
            : "s"}
        </p>

        {sections.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No sections have been added yet.
          </p>
        ) : (
          <ol className="mt-4 grid gap-3">
            {sections.map((section, sectionIndex) => (
              <li
                className="rounded-md border border-border bg-surface-pearl p-4"
                key={section.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    Section {sectionIndex + 1}: {section.title}
                  </p>
                  <Badge variant={section.isActive ? "action" : "neutral"}>
                    {section.isActive ? "Active" : "Disabled"}
                  </Badge>
                </div>

                {(section.lessons ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No lessons yet.
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-2">
                    {(section.lessons ?? []).map((lesson, lessonIndex) => {
                      const lessonFiles = filesByLesson[lesson.id] ?? [];

                      return (
                        <li
                          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                          key={lesson.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">
                              {sectionIndex + 1}.{lessonIndex + 1}{" "}
                              {lesson.title}
                            </p>
                            <Badge
                              variant={lesson.isActive ? "action" : "neutral"}
                            >
                              {lesson.isActive ? "Active" : "Disabled"}
                            </Badge>
                          </div>

                          {lessonFiles.length > 0 ? (
                            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
                              {lessonFiles.map((file) => (
                                <li key={file.id}>
                                  {mediaTypeLabels[file.type] ?? file.type}:{" "}
                                  <a
                                    className="text-primary underline"
                                    href={file.url}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    {file.filename || "Open resource"}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                              No media attached.
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      <InstructorModal
        onClose={() => setShowSubmitModal(false)}
        open={showSubmitModal}
        title="Submit for review"
      >
        <p>
          Submit{" "}
          <span className="font-semibold text-foreground">{course.title}</span>{" "}
          to the reviewer? Course information will be locked while the review is
          in progress.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            onClick={() => setShowSubmitModal(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={submitting}
            onClick={confirmSubmitForReview}
            type="button"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </InstructorModal>
    </div>
  );
}
