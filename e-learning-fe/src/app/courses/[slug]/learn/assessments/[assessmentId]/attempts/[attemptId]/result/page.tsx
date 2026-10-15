import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AttemptResultRouteClient } from "@/features/assessments/components/attempt-result-route-client";
import { getPublicCourseBySlug } from "@/features/courses/api/course-api";
import { ApiError } from "@/lib/api/client";

type AttemptResultRouteProps = {
  params: Promise<{
    slug: string;
    assessmentId: string;
    attemptId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Assessment Result | E-Learning System",
  description: "Review your course assessment result.",
};

export default async function AttemptResultRoute({
  params,
}: AttemptResultRouteProps) {
  const { assessmentId, attemptId, slug } = await params;
  const course = await getCourseOrNotFound(slug);

  return (
    <AttemptResultRouteClient
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
