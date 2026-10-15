import type { Metadata } from "next";
import { Suspense } from "react";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import {
  getPublicCategoryTree,
  getPublicCourses,
} from "@/features/courses/api/course-api";
import { CourseCatalogState } from "@/features/courses/components/course-catalog-state";
import { CourseFilterSummary } from "@/features/courses/components/course-filter-summary";
import { CourseFilters } from "@/features/courses/components/course-filters";
import { CourseGrid } from "@/features/courses/components/course-grid";
import { CoursePagination } from "@/features/courses/components/course-pagination";
import { CourseSearch } from "@/features/courses/components/course-search";
import { CoursesHeader } from "@/features/courses/components/courses-header";
import type {
  CategoryTreeNode,
  PaginatedCourses,
} from "@/features/courses/types/course";
import {
  buildSelectableCategoryGroups,
  flattenCategoryGroups,
  parsePublicCourseQuery,
} from "@/features/courses/utils/course-data";
import { FooterSection } from "../_components/sections/footer-section";
import { footerContent } from "../_components/home-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Courses | E-Learning System",
  description: "Browse public courses by search, category, level, and price.",
};

type CoursesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const navLinks = [{ href: "/courses", label: "Courses" }];

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = parsePublicCourseQuery(resolvedSearchParams);
  const { categories, courses, error } = await getCatalogData(query);
  const categoryGroups = buildSelectableCategoryGroups(categories);
  const categoryOptions = flattenCategoryGroups(categoryGroups);

  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />
      <CoursesHeader total={courses?.meta.total ?? 0} />

      <section className="mx-auto grid w-full max-w-[1440px] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-12 lg:py-10">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={null}>
            <CourseFilters categoryGroups={categoryGroups} query={query} />
          </Suspense>
        </aside>

        <div className="grid gap-5">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <Suspense fallback={null}>
              <CourseSearch initialValue={query.search} />
            </Suspense>
          </div>

          <CourseFilterSummary categories={categoryOptions} query={query} />

          {error ? (
            <CourseCatalogState
              message="The course catalog could not be loaded. Please try again in a moment."
              title="Courses are unavailable"
            />
          ) : (
            <>
              <CourseGrid courses={courses?.data ?? []} />
              {courses ? (
                <CoursePagination meta={courses.meta} query={query} />
              ) : null}
            </>
          )}
        </div>
      </section>

      <FooterSection
        brand={footerContent.brand}
        demoNote={footerContent.demoNote}
        groups={footerContent.groups}
        notice={footerContent.notice}
      />
    </main>
  );
}

async function getCatalogData(
  query: ReturnType<typeof parsePublicCourseQuery>,
) {
  try {
    const [courses, categories] = await Promise.all([
      getPublicCourses(query),
      getPublicCategoryTree(),
    ]);

    return {
      categories,
      courses,
      error: false,
    };
  } catch {
    return {
      categories: [] as CategoryTreeNode[],
      courses: null as PaginatedCourses | null,
      error: true,
    };
  }
}
