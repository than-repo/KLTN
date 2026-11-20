import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { CurriculumBuilder } from "@/features/instructor/components/curriculum-builder";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "Curriculum Builder | E-Learning System",
  description: "Build sections, lessons and media for your course.",
};

type InstructorCurriculumPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InstructorCurriculumPage({
  params,
}: InstructorCurriculumPageProps) {
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
                Curriculum Builder
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={`/instructor/courses/${id}/edit`}
                size="sm"
                variant="secondary"
              >
                Course Settings
              </ButtonLink>
              <ButtonLink
                href={`/instructor/courses/${id}/assessments`}
                size="sm"
                variant="secondary"
              >
                Assessments
              </ButtonLink>
              <ButtonLink href="/instructor/courses" size="sm">
                My Courses
              </ButtonLink>
            </div>
          </div>
          <CurriculumBuilder key={id} />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
