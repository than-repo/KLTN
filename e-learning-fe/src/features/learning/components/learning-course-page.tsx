"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LearnerAssessmentEntry } from "@/features/assessments/components/learner-assessment-entry";
import { useLearnerCourseAssessments } from "@/features/assessments/hooks/use-learner-course-assessments";
import { ApiError } from "@/lib/api/client";

import {
  getLearningLessonDetail,
  getLearningSectionLessons,
  getLearningSections,
} from "../api/learning-course-api";
import type {
  LearningAssessment,
  LearningCourseOverview,
  LearningLessonDetail,
  LearningLessonSummary,
  LearningPaginationMeta,
  LearningSectionSummary,
} from "../types/learning-course";
import { CourseCurriculumSidebar } from "./course-curriculum-sidebar";
import { LessonContentViewer } from "./lesson-content-viewer";
import { LessonHeader } from "./lesson-header";
import { LessonTabs } from "./lesson-tabs";

const SECTION_PAGE_LIMIT = 20;
const LESSON_PAGE_LIMIT = 20;

type LearningCoursePageProps = {
  accessToken: string;
  activeLessonId?: string;
  course: LearningCourseOverview;
  courseSlug: string;
};

export type SectionLessonsState = {
  error: string | null;
  isLoading: boolean;
  lessons: LearningLessonSummary[];
  meta: LearningPaginationMeta | null;
};

type LessonLoadError = "not-found" | "error" | null;

type LoadedLessonContext = {
  lesson: LearningLessonSummary;
  lessonNumber: number;
  nextLesson: LearningLessonSummary | null;
  previousLesson: LearningLessonSummary | null;
  section: LearningSectionSummary;
  sectionNumber: number;
};

export function LearningCoursePage({
  accessToken,
  activeLessonId,
  course,
  courseSlug,
}: LearningCoursePageProps) {
  const searchParams = useSearchParams();

  const activeView = searchParams.get("view");
  const activeAssessmentId = searchParams.get("assessment") ?? undefined;
  const requestedLessonId = searchParams.get("lesson") ?? activeLessonId;

  const isViewingAssessmentList = activeView === "assessments";
  const isViewingAssessment = Boolean(activeAssessmentId);
  const shouldShowLesson = !isViewingAssessmentList && !isViewingAssessment;

  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [sections, setSections] = useState<LearningSectionSummary[]>([]);
  const [sectionsMeta, setSectionsMeta] =
    useState<LearningPaginationMeta | null>(null);
  const [isSectionsLoading, setIsSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sectionLessonsById, setSectionLessonsById] = useState<
    Record<string, SectionLessonsState>
  >({});
  const [activeLesson, setActiveLesson] =
    useState<LearningLessonDetail | null>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<LessonLoadError>(null);

  const loadedLessonContext = useMemo(
    () =>
      activeLesson
        ? getLoadedLessonContext(
            sections,
            sectionLessonsById,
            activeLesson.id,
          )
        : null,
    [activeLesson, sectionLessonsById, sections],
  );

  const firstLoadedLessonHref = useMemo(() => {
    const firstLesson = getFirstLoadedLesson(sections, sectionLessonsById);

    return firstLesson
      ? getLessonHref(courseSlug, firstLesson.lesson.id)
      : null;
  }, [courseSlug, sectionLessonsById, sections]);

  const loadSectionsPage = useCallback(
    async (page: number) => {
      setIsSectionsLoading(true);
      setSectionsError(null);

      try {
        const response = await getLearningSections(course.id, accessToken, {
          limit: SECTION_PAGE_LIMIT,
          page,
        });

        setSections((currentSections) =>
          page === 1
            ? getOrderedSections(response.data)
            : mergeSections(currentSections, response.data),
        );
        setSectionsMeta(response.meta);
      } catch (error) {
        setSectionsError(getLoadErrorMessage(error, "Unable to load sections."));
      } finally {
        setIsSectionsLoading(false);
      }
    },
    [accessToken, course.id],
  );

  const loadSectionLessons = useCallback(
    async (sectionId: string, page = 1) => {
      let shouldSkipRequest = false;

      setSectionLessonsById((currentState) => {
        const currentSectionState = currentState[sectionId];

        if (
          currentSectionState?.isLoading ||
          (page === 1 && currentSectionState?.meta)
        ) {
          shouldSkipRequest = true;
          return currentState;
        }

        return {
          ...currentState,
          [sectionId]: {
            error: null,
            isLoading: true,
            lessons:
              page === 1 ? [] : (currentSectionState?.lessons ?? []),
            meta: currentSectionState?.meta ?? null,
          },
        };
      });

      if (shouldSkipRequest) {
        return;
      }

      try {
        const response = await getLearningSectionLessons(
          course.id,
          sectionId,
          accessToken,
          {
            limit: LESSON_PAGE_LIMIT,
            page,
          },
        );

        setSectionLessonsById((currentState) => {
          const currentSectionState = currentState[sectionId];

          return {
            ...currentState,
            [sectionId]: {
              error: null,
              isLoading: false,
              lessons:
                page === 1
                  ? getOrderedLessonSummaries(response.data)
                  : mergeLessons(
                      currentSectionState?.lessons ?? [],
                      response.data,
                    ),
              meta: response.meta,
            },
          };
        });
      } catch (error) {
        setSectionLessonsById((currentState) => ({
          ...currentState,
          [sectionId]: {
            error: getLoadErrorMessage(error, "Unable to load lessons."),
            isLoading: false,
            lessons: currentState[sectionId]?.lessons ?? [],
            meta: currentState[sectionId]?.meta ?? null,
          },
        }));
      }
    },
    [accessToken, course.id],
  );

  const loadLessonDetail = useCallback(
    async (lessonId: string) => {
      setIsLessonLoading(true);
      setLessonError(null);

      try {
        const lesson = await getLearningLessonDetail(
          course.id,
          lessonId,
          accessToken,
        );

        setActiveLesson(lesson);
      } catch (error) {
        setActiveLesson(null);
        setLessonError(
          error instanceof ApiError && error.statusCode === 404
            ? "not-found"
            : "error",
        );
      } finally {
        setIsLessonLoading(false);
      }
    },
    [accessToken, course.id],
  );

  useEffect(() => {
    setSections([]);
    setSectionsMeta(null);
    setSectionsError(null);
    setSectionLessonsById({});
    setActiveLesson(null);
    setLessonError(null);
    setIsLessonLoading(false);
    void loadSectionsPage(1);
  }, [loadSectionsPage]);

  useEffect(() => {
    if (!shouldShowLesson || !requestedLessonId) {
      return;
    }

    if (activeLesson?.id === requestedLessonId) {
      return;
    }

    void loadLessonDetail(requestedLessonId);
  }, [
    activeLesson?.id,
    loadLessonDetail,
    requestedLessonId,
    shouldShowLesson,
  ]);

  useEffect(() => {
    if (
      !shouldShowLesson ||
      requestedLessonId ||
      activeLesson ||
      isLessonLoading ||
      sections.length === 0
    ) {
      return;
    }

    const firstLesson = getFirstLoadedLesson(sections, sectionLessonsById);

    if (firstLesson) {
      void loadLessonDetail(firstLesson.lesson.id);
      return;
    }

    const nextSectionToLoad = sections.find((section) => {
      const lessonState = sectionLessonsById[section.id];

      return (
        !lessonState ||
        (!lessonState.meta && !lessonState.isLoading && !lessonState.error)
      );
    });

    if (nextSectionToLoad) {
      void loadSectionLessons(nextSectionToLoad.id);
    }
  }, [
    activeLesson,
    isLessonLoading,
    loadLessonDetail,
    loadSectionLessons,
    requestedLessonId,
    sectionLessonsById,
    sections,
    shouldShowLesson,
  ]);

  const {
    assessments,
    error: assessmentsError,
    isLoading: isAssessmentsLoading,
  } = useLearnerCourseAssessments({
    accessToken,
    courseId: course.id,
    enabled: Boolean(accessToken && course.id),
  });

  const sidebar = (
    <>
      <CourseCurriculumSidebar
        activeAssessmentId={activeAssessmentId}
        activeLessonId={isViewingAssessment ? undefined : activeLesson?.id}
        assessments={assessments}
        courseSlug={course.slug}
        isLoadingMoreSections={isSectionsLoading && sections.length > 0}
        onLessonClick={() => setIsCurriculumOpen(false)}
        onLoadMoreSections={() => {
          if (sectionsMeta?.hasNextPage) {
            void loadSectionsPage(sectionsMeta.page + 1);
          }
        }}
        onLoadSectionLessons={loadSectionLessons}
        sectionLessonsById={sectionLessonsById}
        sections={sections}
        sectionsError={sectionsError}
        sectionsMeta={sectionsMeta}
      />

      <AssessmentSidebarNotice
        error={assessmentsError}
        isLoading={isAssessmentsLoading}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-surface-pearl text-foreground">
      <LearningTopBar
        course={course}
        onOpenCurriculum={() => setIsCurriculumOpen(true)}
      />

      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <main className="min-w-0">
          {isViewingAssessment && activeAssessmentId ? (
            accessToken ? (
              <LearnerAssessmentEntry
                accessToken={accessToken}
                assessmentId={activeAssessmentId}
                courseId={course.id}
                courseSlug={course.slug}
              />
            ) : (
              <AssessmentAuthRequired />
            )
          ) : isViewingAssessmentList ? (
            <CourseAssessmentList
              assessments={assessments}
              courseSlug={course.slug}
              error={assessmentsError}
              isLoading={isAssessmentsLoading}
            />
          ) : (
            <LearningLessonPanel
              activeLesson={activeLesson}
              courseSlug={course.slug}
              firstLessonHref={firstLoadedLessonHref}
              isLoading={
                isLessonLoading ||
                (isSectionsLoading && sections.length === 0)
              }
              lessonContext={loadedLessonContext}
              lessonError={lessonError}
              lessonTotal={course.contentSummary.lessonCount}
            />
          )}
        </main>

        <aside
          aria-label="Course curriculum"
          className="hidden min-w-0 lg:sticky lg:top-[88px] lg:block lg:max-h-[calc(100vh-110px)] lg:self-start lg:overflow-y-auto"
        >
          {sidebar}
        </aside>
      </div>

      <button
        className="fixed bottom-4 left-4 right-4 z-30 inline-flex min-h-12 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary-focus lg:hidden"
        onClick={() => setIsCurriculumOpen(true)}
        type="button"
      >
        Open curriculum
      </button>

      {isCurriculumOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 bg-foreground/40 p-3 backdrop-blur-sm lg:hidden"
          role="dialog"
        >
          <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Curriculum
                </p>

                <p className="truncate text-sm font-semibold">{course.title}</p>
              </div>

              <button
                className="shrink-0 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                onClick={() => setIsCurriculumOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto p-4">{sidebar}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LearningLessonPanel({
  activeLesson,
  courseSlug,
  firstLessonHref,
  isLoading,
  lessonContext,
  lessonError,
  lessonTotal,
}: {
  activeLesson: LearningLessonDetail | null;
  courseSlug: string;
  firstLessonHref: string | null;
  isLoading: boolean;
  lessonContext: LoadedLessonContext | null;
  lessonError: LessonLoadError;
  lessonTotal: number;
}) {
  if (isLoading) {
    return <LessonLoadingState />;
  }

  if (lessonError === "not-found") {
    return <LessonNotFound firstLessonHref={firstLessonHref} />;
  }

  if (lessonError === "error") {
    return <LessonLoadFailed courseSlug={courseSlug} />;
  }

  if (!activeLesson) {
    return lessonTotal === 0 ? (
      <EmptyCourseState courseSlug={courseSlug} />
    ) : (
      <LessonLoadingState />
    );
  }

  return (
    <div className="grid gap-5">
      <LessonContentViewer
        lesson={activeLesson}
        sectionTitle={lessonContext?.section.title ?? "Current lesson"}
      />

      <LessonHeader
        courseSlug={courseSlug}
        lesson={activeLesson}
        lessonNumber={lessonContext?.lessonNumber ?? activeLesson.lessonIndex + 1}
        nextLesson={lessonContext?.nextLesson ?? null}
        previousLesson={lessonContext?.previousLesson ?? null}
        sectionNumber={lessonContext?.sectionNumber}
        sectionTitle={lessonContext?.section.title ?? "Current lesson"}
      />

      <LessonTabs lesson={activeLesson} />
    </div>
  );
}

function LearningTopBar({
  course,
  onOpenCurriculum,
}: {
  course: LearningCourseOverview;
  onOpenCurriculum: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 text-foreground shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          className="shrink-0 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
          href="/my-courses"
        >
          Back
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Learning workspace
          </p>

          <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">
            {course.title}
          </h1>
        </div>

        <div className="hidden shrink-0 items-center gap-2 text-xs font-semibold sm:flex">
          <TopBarStat
            label="Sections"
            value={course.contentSummary.sectionCount}
          />
          <TopBarStat
            label="Lessons"
            value={course.contentSummary.lessonCount}
          />
          <TopBarStat
            label="Progress"
            value={`${Math.round(course.progressPercentage)}%`}
          />
        </div>

        <button
          className="shrink-0 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary lg:hidden"
          onClick={onOpenCurriculum}
          type="button"
        >
          Lessons
        </button>
      </div>
    </header>
  );
}

function TopBarStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <span className="rounded-md border border-border bg-background px-3 py-1">
      {value} {label}
    </span>
  );
}

function AssessmentSidebarNotice({
  error,
  isLoading,
}: {
  error?: string | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <p className="mt-3 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        Loading assessments...
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-3 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
        Unable to load assessments.
      </p>
    );
  }

  return null;
}

function AssessmentAuthRequired() {
  return (
    <section className="rounded-lg border border-border bg-card px-5 py-14 text-center shadow-sm">
      <p className="text-sm font-semibold text-primary">Assessment locked</p>

      <h2 className="mt-2 text-2xl font-semibold leading-tight">
        Please sign in to view this assessment.
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Your session is required to load assessment attempts, history, and
        results.
      </p>

      <Link
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
        href="/login"
      >
        Go to login
      </Link>
    </section>
  );
}

function LessonLoadingState() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="h-7 w-2/3 rounded-md bg-muted" />
      <div className="mt-5 aspect-video rounded-lg bg-muted" />
      <div className="mt-5 h-10 w-3/4 rounded-md bg-muted" />
      <div className="mt-4 h-24 rounded-md bg-muted" />
    </section>
  );
}

function LessonLoadFailed({ courseSlug }: { courseSlug: string }) {
  return (
    <section className="rounded-lg border border-danger/20 bg-danger/5 px-5 py-14 text-center shadow-sm">
      <p className="text-sm font-semibold text-danger">Lesson unavailable</p>

      <h2 className="mt-2 text-2xl font-semibold leading-tight">
        Unable to load this lesson.
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Please try again, or return to the course detail page.
      </p>

      <Link
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
        href={`/courses/${courseSlug}`}
      >
        Back to course
      </Link>
    </section>
  );
}

function LessonNotFound({
  firstLessonHref,
}: {
  firstLessonHref: string | null;
}) {
  return (
    <section className="rounded-lg border border-border bg-card px-5 py-14 text-center shadow-sm">
      <p className="text-sm font-semibold text-primary">Lesson not found</p>

      <h2 className="mt-2 text-2xl font-semibold leading-tight">
        This lesson is not available.
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        The lesson link may be stale, or this lesson is no longer part of the
        published course content.
      </p>

      {firstLessonHref ? (
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
          href={firstLessonHref}
        >
          Open first loaded lesson
        </Link>
      ) : null}
    </section>
  );
}

function EmptyCourseState({ courseSlug }: { courseSlug: string }) {
  return (
    <section className="rounded-lg border border-border bg-card px-5 py-14 text-center shadow-sm">
      <p className="text-sm font-semibold text-primary">No lessons</p>

      <h2 className="mt-2 text-2xl font-semibold leading-tight">
        This course does not have learning content yet.
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Check the course detail page for the latest course information.
      </p>

      <Link
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
        href={`/courses/${courseSlug}`}
      >
        Back to course
      </Link>
    </section>
  );
}

function getLessonHref(courseSlug: string, lessonId: string) {
  return `/courses/${courseSlug}/learn?lesson=${encodeURIComponent(lessonId)}`;
}

function CourseAssessmentList({
  assessments,
  courseSlug,
  error,
  isLoading,
}: {
  assessments: LearningAssessment[];
  courseSlug: string;
  error?: string | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Loading assessments...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-danger/20 bg-danger/5 p-6">
        <p className="text-sm font-semibold text-danger">
          Unable to load assessments
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </section>
    );
  }

  if (assessments.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold">No assessments yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This course does not have any assessments available.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Assessments
        </p>

        <h2 className="mt-2 text-2xl font-semibold">Course assessments</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Choose an assessment to view details, attempts, history, and start or
          continue.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        {assessments.map((assessment) => (
          <Link
            className="group rounded-xl border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            href={`/courses/${courseSlug}/learn?assessment=${encodeURIComponent(
              assessment.id,
            )}`}
            key={assessment.id}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-pill border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                    {assessment.type === "PROJECT" ? "Project" : "Quiz"}
                  </span>

                  <span className="rounded-pill border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {assessment.totalPoints} pts
                  </span>
                </div>

                <h3 className="mt-3 break-words text-lg font-semibold text-foreground group-hover:text-primary">
                  {assessment.title}
                </h3>

                {assessment.description ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {assessment.description}
                  </p>
                ) : null}
              </div>

              <div className="grid shrink-0 gap-2 text-sm text-muted-foreground sm:text-right">
                <span>
                  Passing:{" "}
                  <strong className="text-foreground">
                    {assessment.passingScore ?? "No minimum"}
                  </strong>
                </span>

                <span>
                  Time:{" "}
                  <strong className="text-foreground">
                    {assessment.timeLimitMinutes
                      ? `${assessment.timeLimitMinutes} min`
                      : "No limit"}
                  </strong>
                </span>

                <span>
                  Attempts:{" "}
                  <strong className="text-foreground">
                    {assessment.maxAttempts ?? "Unlimited"}
                  </strong>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function getOrderedSections(sections: LearningSectionSummary[]) {
  return [...sections].sort(
    (first, second) => first.sectionIndex - second.sectionIndex,
  );
}

function getOrderedLessonSummaries(lessons: LearningLessonSummary[]) {
  return [...lessons].sort(
    (first, second) => first.lessonIndex - second.lessonIndex,
  );
}

function mergeSections(
  currentSections: LearningSectionSummary[],
  nextSections: LearningSectionSummary[],
) {
  const sectionsById = new Map<string, LearningSectionSummary>();

  [...currentSections, ...nextSections].forEach((section) => {
    sectionsById.set(section.id, section);
  });

  return getOrderedSections([...sectionsById.values()]);
}

function mergeLessons(
  currentLessons: LearningLessonSummary[],
  nextLessons: LearningLessonSummary[],
) {
  const lessonsById = new Map<string, LearningLessonSummary>();

  [...currentLessons, ...nextLessons].forEach((lesson) => {
    lessonsById.set(lesson.id, lesson);
  });

  return getOrderedLessonSummaries([...lessonsById.values()]);
}

function getLoadedLessonContext(
  sections: LearningSectionSummary[],
  sectionLessonsById: Record<string, SectionLessonsState>,
  lessonId: string,
) {
  const loadedLessons = getLoadedLessonContexts(sections, sectionLessonsById);
  const activeIndex = loadedLessons.findIndex(
    (loadedLesson) => loadedLesson.lesson.id === lessonId,
  );

  if (activeIndex < 0) {
    return null;
  }

  return {
    ...loadedLessons[activeIndex],
    nextLesson: loadedLessons[activeIndex + 1]?.lesson ?? null,
    previousLesson: loadedLessons[activeIndex - 1]?.lesson ?? null,
  };
}

function getFirstLoadedLesson(
  sections: LearningSectionSummary[],
  sectionLessonsById: Record<string, SectionLessonsState>,
) {
  return getLoadedLessonContexts(sections, sectionLessonsById)[0] ?? null;
}

function getLoadedLessonContexts(
  sections: LearningSectionSummary[],
  sectionLessonsById: Record<string, SectionLessonsState>,
) {
  return getOrderedSections(sections).flatMap((section, sectionPosition) =>
    getOrderedLessonSummaries(
      sectionLessonsById[section.id]?.lessons ?? [],
    ).map((lesson, lessonPosition) => ({
      lesson,
      lessonNumber: lessonPosition + 1,
      nextLesson: null,
      previousLesson: null,
      section,
      sectionNumber: sectionPosition + 1,
    })),
  );
}

function getLoadErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
