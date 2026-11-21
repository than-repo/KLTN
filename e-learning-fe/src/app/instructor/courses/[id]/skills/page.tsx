import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { InstructorCourseSkillsPage } from "@/features/instructor/components/instructor-course-skills-page";
import { InstructorCourseTabsWithCounts } from "@/features/instructor/components/instructor-course-tabs-with-counts";
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
            <InstructorCourseTabsWithCounts courseId={id} currentTab="skills" />
          </div>
          <InstructorCourseSkillsPage courseId={id} />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}