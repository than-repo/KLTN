import type { ReactNode } from "react";

import type { PublicCourse } from "../types/course";
import {
  formatCourseDuration,
  formatCourseLevel,
  formatCoursePrice,
} from "../utils/course-data";
import { CourseImage } from "./course-image";

type CourseDetailProps = {
  course: PublicCourse;
  enrollmentPanel?: ReactNode;
};

export function CourseDetail({ course, enrollmentPanel }: CourseDetailProps) {
  const primaryInstructor = course.instructors?.[0]?.fullName;
  const categoryNames =
    course.categories?.map((category) => category.name) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <article className="grid gap-5">
        <section className="rounded-lg bg-surface-black px-5 py-8 text-white shadow-sm sm:px-7 lg:px-8 lg:py-10">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md border border-white/15 bg-white/10 px-3 py-1 text-sm text-white">
              {formatCourseLevel(course.level)}
            </span>
            {course.certificateEnabled ? (
              <span className="rounded-md border border-primary-on-dark/30 bg-primary-on-dark/15 px-3 py-1 text-sm text-primary-on-dark">
                Certificate
              </span>
            ) : null}
            {categoryNames.slice(0, 3).map((categoryName) => (
              <span
                className="rounded-md border border-white/15 px-3 py-1 text-sm text-white/80"
                key={categoryName}
              >
                {categoryName}
              </span>
            ))}
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">
            {course.title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/75">
            {course.shortDescription}
          </p>
          <dl className="mt-6 grid gap-3 text-sm text-white/75 sm:grid-cols-3">
            <HeroFact
              label="Instructor"
              value={primaryInstructor ?? "Not assigned"}
            />
            <HeroFact
              label="Duration"
              value={formatCourseDuration(course.durationInMinutes)}
            />
            <HeroFact
              label="Language"
              value={course.language ?? "Not specified"}
            />
          </dl>
        </section>

        <aside className="rounded-lg border border-border bg-card p-5 shadow-sm lg:hidden">
          <CourseImage course={course} />
          <CourseFacts course={course} primaryInstructor={primaryInstructor} />
          {enrollmentPanel}
        </aside>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <SectionTitle title="About this course" />
          {course.description ? (
            <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">
              {course.description}
            </p>
          ) : (
            <p className="mt-3 leading-7 text-muted-foreground">
              This course description is not available yet.
            </p>
          )}
        </section>

        {course.whatYouWillLearn?.length ? (
          <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <svg
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M20 6 9 17l-5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div>
                  <SectionTitle title="What you will learn" />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Key skills and concepts you will gain from this course.
                  </p>
                </div>
              </div>

              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {course.whatYouWillLearn.map((item) => (
                  <li
                    className="group flex gap-3 rounded-xl border border-border bg-background/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                    key={item}
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <svg
                        className="size-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M20 6 9 17l-5-5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>

                    <span className="text-sm font-medium leading-6 text-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {course.requirements?.length ? (
          <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <svg
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div>
                  <SectionTitle title="Requirements" />
                  <p className="mt-1 text-sm text-muted-foreground">
                    What you should prepare before starting this course.
                  </p>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {course.requirements.map((item, index) => (
                  <li
                    className="group flex items-start gap-4 rounded-xl border border-border bg-background/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md"
                    key={item}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-semibold text-amber-600 transition group-hover:bg-amber-500 group-hover:text-white">
                      {index + 1}
                    </span>

                    <span className="text-sm font-medium leading-6 text-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </article>

      <aside className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-lg lg:sticky lg:top-20 lg:block">
        <CourseImage course={course} />
        <div className="p-5">
          <CourseFacts course={course} primaryInstructor={primaryInstructor} />
          {enrollmentPanel}
        </div>
      </aside>
    </div>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-white/45">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-white">{value}</dd>
    </div>
  );
}

function CourseFacts({
  course,
  primaryInstructor,
}: {
  course: PublicCourse;
  primaryInstructor?: string;
}) {
  return (
    <>
      <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Course summary
      </p>
      <p className="mt-2 text-3xl font-semibold">
        {formatCoursePrice(course.price)}
      </p>
      <dl className="mt-5 grid gap-4 text-sm">
        <DetailRow
          label="Duration"
          value={formatCourseDuration(course.durationInMinutes)}
        />
        <DetailRow label="Level" value={formatCourseLevel(course.level)} />
        <DetailRow
          label="Language"
          value={course.language ?? "Not specified"}
        />
        <DetailRow
          label="Instructor"
          value={primaryInstructor ?? "Not assigned"}
        />
        <DetailRow
          label="Certificate"
          value={course.certificateEnabled ? "Included" : "Not included"}
        />
      </dl>
    </>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-2xl font-semibold leading-tight">{title}</h2>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
