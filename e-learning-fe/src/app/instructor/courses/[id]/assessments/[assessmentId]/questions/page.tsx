import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { AssessmentQuestionsManager } from "@/features/instructor/components/assessment-questions-manager";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "Assessment Questions | E-Learning System",
  description: "Create and manage questions for this assessment.",
};

type AssessmentQuestionsPageProps = {
  params: Promise<{ assessmentId: string; id: string }>;
};

export default async function AssessmentQuestionsPage({
  params,
}: AssessmentQuestionsPageProps) {
  const { assessmentId, id } = await params;

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
                Assessment Questions
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={`/instructor/courses/${id}/assessments/${assessmentId}/edit`}
                size="sm"
                variant="secondary"
              >
                Edit Assessment
              </ButtonLink>
              <ButtonLink
                href={`/instructor/courses/${id}/assessments`}
                size="sm"
              >
                Back to Assessments
              </ButtonLink>
            </div>
          </div>
          <AssessmentQuestionsManager
            assessmentId={assessmentId}
            courseId={id}
            key={assessmentId}
          />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
