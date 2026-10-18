import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { CreateAssessmentForm } from "@/features/instructor/components/create-assessment-form";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "New Assessment | E-Learning System",
  description: "Create a quiz or project for this course.",
};

type NewAssessmentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewAssessmentPage({
  params,
}: NewAssessmentPageProps) {
  const { id } = await params;

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
                New assessment
              </h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Create a quiz or project for this course.
              </p>
            </div>
            <ButtonLink
              href={`/instructor/courses/${id}/assessments`}
              size="sm"
              variant="secondary"
            >
              Back to Assessments
            </ButtonLink>
          </div>
          <CreateAssessmentForm courseId={id} />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
