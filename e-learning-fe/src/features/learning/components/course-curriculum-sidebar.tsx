import Link from "next/link";

import type { SectionLessonsState } from "./learning-course-page";
import type {
  LearningAssessment,
  LearningPaginationMeta,
  LearningSectionSummary,
} from "../types/learning-course";

type CourseCurriculumSidebarProps = {
  activeAssessmentId?: string;
  activeLessonId?: string;
  assessments?: LearningAssessment[];
  courseSlug: string;
  isLoadingMoreSections: boolean;
  onLessonClick?: () => void;
  onLoadMoreSections: () => void;
  onLoadSectionLessons: (sectionId: string, page?: number) => void;
  sectionLessonsById: Record<string, SectionLessonsState>;
  sections: LearningSectionSummary[];
  sectionsError?: string | null;
  sectionsMeta: LearningPaginationMeta | null;
};

function getOrderedAssessments(assessments: LearningAssessment[]) {
  return [...assessments].sort((firstAssessment, secondAssessment) => {
    if (firstAssessment.order !== secondAssessment.order) {
      return firstAssessment.order - secondAssessment.order;
    }

    return firstAssessment.title.localeCompare(secondAssessment.title);
  });
}

function getAssessmentTypeLabel(type: LearningAssessment["type"]) {
  switch (type) {
    case "QUIZ":
      return "Quiz";
    case "PROJECT":
      return "Project";
    default:
      return type;
  }
}

function getAssessmentTypeMark(type: LearningAssessment["type"]) {
  switch (type) {
    case "QUIZ":
      return "Q";
    case "PROJECT":
      return "P";
    default:
      return "A";
  }
}

function getAssessmentMeta(assessment: LearningAssessment) {
  const parts: string[] = [];

  parts.push(`${assessment.totalPoints} pts`);

  if (assessment.timeLimitMinutes) {
    parts.push(`${assessment.timeLimitMinutes} min`);
  }

  if (assessment.maxAttempts) {
    parts.push(`${assessment.maxAttempts} attempts`);
  }

  return parts.join(" - ");
}

export function CourseCurriculumSidebar({
  activeAssessmentId,
  activeLessonId,
  assessments = [],
  courseSlug,
  isLoadingMoreSections,
  onLessonClick,
  onLoadMoreSections,
  onLoadSectionLessons,
  sectionLessonsById,
  sections,
  sectionsError,
  sectionsMeta,
}: CourseCurriculumSidebarProps) {
  const orderedAssessments = getOrderedAssessments(assessments);
  const hasAssessments = orderedAssessments.length > 0;

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Course content
          </p>

          <h2 className="mt-1 text-xl font-semibold leading-tight">
            Curriculum
          </h2>
        </div>

        <span className="shrink-0 rounded-md border border-border bg-surface-pearl px-3 py-1 text-sm font-semibold">
          {sections.length + (hasAssessments ? 1 : 0)}
        </span>
      </div>

      {sectionsError ? (
        <p className="mt-4 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
          {sectionsError}
        </p>
      ) : null}

      <nav
        aria-label="Course lessons and assessments"
        className="mt-4 grid gap-4"
      >
        {sections.map((section, sectionIndex) => {
          const lessonsState = sectionLessonsById[section.id];
          const lessons = lessonsState?.lessons ?? [];
          const hasActiveLesson = lessons.some(
            (lesson) => lesson.id === activeLessonId,
          );

          return (
            <details
              className="rounded-md border border-border bg-background p-3 open:border-primary/40"
              key={section.id}
              open={hasActiveLesson || sectionIndex === 0}
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  onLoadSectionLessons(section.id);
                }
              }}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface-pearl text-sm font-semibold">
                    {sectionIndex + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold leading-snug">
                      {section.title}
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {section.lessonCount} lessons
                    </p>
                  </div>
                </div>
              </summary>

              {section.description ? (
                <p className="mt-3 whitespace-pre-line break-words border-l border-border pl-3 text-xs leading-5 text-muted-foreground">
                  {section.description}
                </p>
              ) : null}

              <div className="mt-3 grid gap-2">
                {lessonsState?.isLoading && lessons.length === 0 ? (
                  <LessonListNotice label="Loading lessons..." />
                ) : null}

                {lessonsState?.error ? (
                  <LessonListNotice isError label={lessonsState.error} />
                ) : null}

                {lessonsState?.meta && lessons.length === 0 ? (
                  <LessonListNotice label="No lessons in this section." />
                ) : null}

                {lessons.map((lesson, lessonIndex) => {
                  const isActive = lesson.id === activeLessonId;

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-md border p-3 text-left transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-primary/50",
                      ].join(" ")}
                      href={`/courses/${courseSlug}/learn?lesson=${encodeURIComponent(
                        lesson.id,
                      )}`}
                      key={lesson.id}
                      onClick={onLessonClick}
                    >
                      <span className="grid size-8 place-items-center rounded-md border border-border bg-surface-pearl text-xs font-semibold text-foreground">
                        {lessonIndex + 1}
                      </span>

                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-ink-muted">
                          Lesson {lessonIndex + 1}
                        </span>

                        <span className="mt-1 block break-words text-sm font-semibold leading-snug">
                          {lesson.title}
                        </span>

                        <span className="mt-1 block text-xs text-muted-foreground">
                          {lesson.fileCount} files
                        </span>
                      </span>
                    </Link>
                  );
                })}

                {lessonsState?.meta?.hasNextPage ? (
                  <button
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={lessonsState.isLoading}
                    onClick={() =>
                      onLoadSectionLessons(
                        section.id,
                        lessonsState.meta ? lessonsState.meta.page + 1 : 1,
                      )
                    }
                    type="button"
                  >
                    {lessonsState.isLoading ? "Loading..." : "Load more lessons"}
                  </button>
                ) : null}
              </div>
            </details>
          );
        })}

        {sectionsMeta?.hasNextPage ? (
          <button
            className="rounded-md border border-border bg-background px-4 py-3 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingMoreSections}
            onClick={onLoadMoreSections}
            type="button"
          >
            {isLoadingMoreSections ? "Loading sections..." : "Load more sections"}
          </button>
        ) : null}

        {hasAssessments ? (
          <details
            className="rounded-md border border-border bg-background p-3 open:border-primary/40"
            open={Boolean(activeAssessmentId)}
          >
            <summary className="cursor-pointer list-none">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface-pearl text-sm font-semibold">
                  A
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold leading-snug">
                    Assessments
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {orderedAssessments.length} assessments
                  </p>
                </div>
              </div>
            </summary>

            <div className="mt-3">
              <Link
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold transition hover:border-primary/50 hover:text-primary"
                href={`/courses/${courseSlug}/learn?view=assessments`}
                onClick={onLessonClick}
              >
                <span>All assessments</span>
                <span className="text-xs text-muted-foreground">
                  {orderedAssessments.length}
                </span>
              </Link>
            </div>

            <div className="mt-3 grid gap-2">
              {orderedAssessments.map((assessment, assessmentIndex) => {
                const isActive = assessment.id === activeAssessmentId;

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-md border p-3 text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/50",
                    ].join(" ")}
                    href={`/courses/${courseSlug}/learn?assessment=${encodeURIComponent(
                      assessment.id,
                    )}`}
                    key={assessment.id}
                    onClick={onLessonClick}
                  >
                    <span className="grid size-8 place-items-center rounded-md border border-border bg-surface-pearl text-xs font-semibold text-foreground">
                      {getAssessmentTypeMark(assessment.type)}
                    </span>

                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-ink-muted">
                        {getAssessmentTypeLabel(assessment.type)}{" "}
                        {assessmentIndex + 1}
                      </span>

                      <span className="mt-1 block break-words text-sm font-semibold leading-snug">
                        {assessment.title}
                      </span>

                      <span className="mt-1 block text-xs text-muted-foreground">
                        {getAssessmentMeta(assessment)}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </details>
        ) : null}
      </nav>
    </section>
  );
}

function LessonListNotice({
  isError = false,
  label,
}: {
  isError?: boolean;
  label: string;
}) {
  return (
    <p
      className={[
        "rounded-md border px-3 py-2 text-xs",
        isError
          ? "border-danger/20 bg-danger/5 text-danger"
          : "border-border bg-card text-muted-foreground",
      ].join(" ")}
    >
      {label}
    </p>
  );
}
