import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { InstructorAssessmentsContent } from "@/features/instructor/components/instructor-assessments-content";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "Course Assessments | E-Learning System",
  description: "Manage quizzes and projects for this course.",
};

type InstructorCourseAssessmentsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InstructorCourseAssessmentsPage({
  params,
}: InstructorCourseAssessmentsPageProps) {
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
                Course Assessments
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Manage quizzes and projects for this course.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={`/instructor/courses/${id}/curriculum`}
                size="sm"
                variant="secondary"
              >
                Curriculum
              </ButtonLink>
              <ButtonLink href="/instructor/courses" size="sm">
                My Courses
              </ButtonLink>
            </div>
          </div>
          <InstructorAssessmentsContent courseId={id} />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
