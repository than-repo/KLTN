import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type {
  LearningLessonDetail,
  LearningLessonSummary,
  LearningSkill,
} from "../types/learning-course";

type LessonHeaderProps = {
  courseSlug: string;
  lesson: LearningLessonDetail;
  lessonNumber: number;
  nextLesson: LearningLessonSummary | null;
  previousLesson: LearningLessonSummary | null;
  sectionNumber?: number;
  sectionTitle: string;
};

const difficultyColors: Record<LearningSkill["difficulty"], string> = {
  EASY: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  HARD: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function LessonHeader({
  courseSlug,
  lesson,
  lessonNumber,
  nextLesson,
  previousLesson,
  sectionNumber,
  sectionTitle,
}: LessonHeaderProps) {
  const skills = lesson.skills ?? [];

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap gap-2 text-sm font-semibold">
        {sectionNumber ? (
          <span className="rounded-md border border-border bg-surface-pearl px-3 py-1">
            Section {sectionNumber}
          </span>
        ) : null}

        <span className="rounded-md border border-border bg-background px-3 py-1">
          Lesson {lessonNumber}
        </span>
      </div>

      <h2 className="mt-4 break-words text-2xl font-semibold leading-tight sm:text-3xl">
        {lesson.title}
      </h2>

      <p className="mt-2 break-words text-sm font-semibold text-ink-muted">
        {sectionTitle}
      </p>

      {lesson.description ? (
        <p className="mt-3 max-w-3xl whitespace-pre-line break-words text-base leading-7 text-muted-foreground">
          {lesson.description}
        </p>
      ) : null}

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Lesson skills">
          {skills.map((skill) => (
            <Badge
              key={skill.id}
              variant="action"
              className={difficultyColors[skill.difficulty]}
              title={skill.description ?? undefined}
            >
              {skill.canonicalName}
            </Badge>
          ))}
        </div>
      )}

      {(previousLesson || nextLesson) && (
        <nav
          aria-label="Lesson navigation"
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          {previousLesson && (
            <LessonNavigationLink
              href={getLessonHref(courseSlug, previousLesson.id)}
              label="Previous"
              title={previousLesson.title}
            />
          )}

          {nextLesson && (
            <LessonNavigationLink
              align="right"
              href={getLessonHref(courseSlug, nextLesson.id)}
              label="Next"
              title={nextLesson.title}
            />
          )}
        </nav>
      )}
    </section>
  );
}

function LessonNavigationLink({
  align = "left",
  href,
  label,
  title,
}: {
  align?: "left" | "right";
  href: string;
  label: string;
  title: string;
}) {
  return (
    <Link
      className={[
        "min-h-14 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary sm:max-w-[48%]",
        align === "right" ? "text-left sm:ml-auto sm:text-right" : "text-left",
      ].join(" ")}
      href={href}
    >
      <span className="block text-xs uppercase text-ink-muted">{label}</span>
      <span className="mt-1 block truncate">{title}</span>
    </Link>
  );
}

function getLessonHref(courseSlug: string, lessonId: string) {
  return `/courses/${courseSlug}/learn?lesson=${encodeURIComponent(lessonId)}`;
}
