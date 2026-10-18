import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { EditAssessmentForm } from "@/features/instructor/components/edit-assessment-form";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "Edit Assessment | E-Learning System",
  description: "Update assessment settings before publishing.",
};

type EditAssessmentPageProps = {
  params: Promise<{ assessmentId: string; id: string }>;
};

export default async function EditAssessmentPage({
  params,
}: EditAssessmentPageProps) {
  const { assessmentId, id } = await params;

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
                Edit Assessment
              </h1>
            </div>
            <ButtonLink
              href={`/instructor/courses/${id}/assessments`}
              size="sm"
              variant="secondary"
            >
              Back to Assessments
            </ButtonLink>
          </div>
          <EditAssessmentForm
            assessmentId={assessmentId}
            courseId={id}
            key={assessmentId}
          />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
