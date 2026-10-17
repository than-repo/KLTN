import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { InstructorCoursesContent } from "@/features/instructor/components/instructor-courses-content";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "My Courses | E-Learning System",
  description: "Create, review and manage the courses you instruct.",
};

export default function InstructorCoursesPage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={instructorNavLinks} />
      <RoleProtectedRoute allowedRoles={["INSTRUCTOR"]} fallbackHref="/">
        <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Instructor workspace
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
              My Courses
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Create draft courses, build their curriculum, and follow each
              course through the review process.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/instructor/courses/new" size="sm">
                Create Course
              </ButtonLink>
              <ButtonLink href="/instructor" size="sm" variant="secondary">
                Back to Dashboard
              </ButtonLink>
            </div>
          </div>
          <InstructorCoursesContent />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
