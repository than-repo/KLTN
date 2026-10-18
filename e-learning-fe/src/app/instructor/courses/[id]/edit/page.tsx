import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { EditCourseForm } from "@/features/instructor/components/edit-course-form";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "Edit Course | E-Learning System",
  description: "Update course information before submitting it for review.",
};

type EditInstructorCoursePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditInstructorCoursePage({
  params,
}: EditInstructorCoursePageProps) {
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
                Course Settings
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
          <EditCourseForm key={id} />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
