//src\app\courses\[slug]\learn\page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicCourseBySlug } from "@/features/courses/api/course-api";
import { CourseLearningContent } from "@/features/learning/components/course-learning-content";
import { ApiError } from "@/lib/api/client";

type CourseLearnRouteProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Learning | E-Learning System",
  description: "Continue a course with sections, lessons, and learning files.",
};

export default async function CourseLearnRoute({
  params,
  searchParams,
}: CourseLearnRouteProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const course = await getCourseOrNotFound(slug);

  return (
    <CourseLearningContent
      activeLessonId={getFirstParam(resolvedSearchParams.lesson)}
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

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
