import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import {
  getPublicCategoryTree,
  getPublicCourses,
} from "@/features/courses/api/course-api";
import type {
  CategoryTreeNode,
  PaginatedCourses,
  PublicCourseQuery,
} from "@/features/courses/types/course";

import {
  benefits,
  brandLabel,
  finalCta,
  footerContent,
  heroContent,
  learnerOutcomes,
  navLinks,
  stats,
  trustCards,
} from "./home-content";
import { CategorySection } from "./sections/category-section";
import { FeaturedCoursesSection } from "./sections/featured-courses-section";
import { FinalCtaSection } from "./sections/final-cta-section";
import { FooterSection } from "./sections/footer-section";
import { HeroSection } from "./sections/hero-section";
import { RoleSection } from "./sections/role-section";
import { StatsSection } from "./sections/stats-section";

const featuredCourseQuery: PublicCourseQuery = {
  limit: 6,
  page: 1,
  sortDirection: "desc",
  sortField: "publishedAt",
};

export async function HomePage() {
  const { categories, courses, error } = await getHomeCatalogData();
  const topCategories = categories.slice(0, 10);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicNavbar brandLabel={brandLabel} links={navLinks} />
      <HeroSection
        benefits={benefits}
        description={heroContent.description}
        eyebrow={heroContent.eyebrow}
        image={heroContent.image}
        primaryAction={heroContent.primaryAction}
        searchPlaceholder={heroContent.searchPlaceholder}
        secondaryAction={heroContent.secondaryAction}
        title={heroContent.title}
      />
      <CategorySection categories={topCategories} isUnavailable={error} />
      <StatsSection stats={stats} />
      <FeaturedCoursesSection
        courses={courses?.data ?? []}
        isUnavailable={error}
      />
      <RoleSection outcomes={learnerOutcomes} trustCards={trustCards} />
      <FinalCtaSection
        description={finalCta.description}
        primaryAction={finalCta.primaryAction}
        secondaryAction={finalCta.secondaryAction}
        title={finalCta.title}
      />
      <FooterSection
        brand={footerContent.brand}
        demoNote={footerContent.demoNote}
        groups={footerContent.groups}
        notice={footerContent.notice}
      />
    </main>
  );
}

async function getHomeCatalogData() {
  try {
    const [courses, categories] = await Promise.all([
      getPublicCourses(featuredCourseQuery),
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
