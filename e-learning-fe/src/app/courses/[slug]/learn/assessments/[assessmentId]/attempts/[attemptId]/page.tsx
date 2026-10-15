import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssessmentAttemptRouteClient } from "@/features/assessments/components/assessment-attempt-route-client";
import { getPublicCourseBySlug } from "@/features/courses/api/course-api";
import { ApiError } from "@/lib/api/client";

type AssessmentAttemptRouteProps = {
  params: Promise<{
    slug: string;
    assessmentId: string;
    attemptId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Assessment Attempt | E-Learning System",
  description: "Complete a course assessment attempt.",
};

export default async function AssessmentAttemptRoute({
  params,
}: AssessmentAttemptRouteProps) {
  const { assessmentId, attemptId, slug } = await params;
  const course = await getCourseOrNotFound(slug);

  return (
    <AssessmentAttemptRouteClient
      assessmentId={assessmentId}
      attemptId={attemptId}
      courseId={course.id}
      courseSlug={course.slug}
    />
  );
}

async function getCourseOrNotFound(slug: string) {
  try {
    return await getPublicCourseBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }

    throw error;
  }
}
