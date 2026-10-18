import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { CreateCourseForm } from "@/features/instructor/components/create-course-form";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "Create Course | E-Learning System",
  description: "Create a new draft course for the review pipeline.",
};

export default function CreateInstructorCoursePage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={instructorNavLinks} />
      <RoleProtectedRoute allowedRoles={["INSTRUCTOR"]} fallbackHref="/">
        <section className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Instructor workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
                Create Course
              </h1>
            </div>
            <ButtonLink
              href="/instructor/courses"
              size="sm"
              variant="secondary"
            >
              Back to My Courses
            </ButtonLink>
          </div>
          <CreateCourseForm />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
