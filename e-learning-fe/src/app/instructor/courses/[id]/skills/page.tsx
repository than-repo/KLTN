import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { InstructorCourseSkillsPage } from "@/features/instructor/components/instructor-course-skills-page";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "Course Skills | E-Learning System",
  description: "Manage skills for your course.",
};

type InstructorCourseSkillsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InstructorCourseSkillsRoute({
  params,
}: InstructorCourseSkillsPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={instructorNavLinks} />
      <RoleProtectedRoute allowedRoles={["INSTRUCTOR"]} fallbackHref="/">
        <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Instructor workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
                Course Skills
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/instructor/courses/${id}/edit`}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface-pearl px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                Course Settings
              </a>
              <a
                href={`/instructor/courses/${id}/curriculum`}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface-pearl px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                Curriculum Builder
              </a>
              <a
                href={`/instructor/courses/${id}/assessments`}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface-pearl px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                Assessments
              </a>
              <a
                href="/instructor/courses"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
              >
                My Courses
              </a>
            </div>
          </div>
          <InstructorCourseSkillsPage courseId={id} />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}