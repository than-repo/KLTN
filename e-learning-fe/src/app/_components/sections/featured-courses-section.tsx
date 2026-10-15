import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeader } from "@/components/ui/section-header";
import { CourseCard } from "@/features/courses/components/course-card";
import type { PublicCourse } from "@/features/courses/types/course";

type FeaturedCoursesSectionProps = {
  courses: PublicCourse[];
  isUnavailable: boolean;
};

export function FeaturedCoursesSection({
  courses,
  isUnavailable,
}: FeaturedCoursesSectionProps) {
  return (
    <section id="featured-courses" className="scroll-mt-24 bg-muted">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <SectionHeader
          action={
            <ButtonLink href="/courses" size="sm" variant="ghost">
              View all courses
            </ButtonLink>
          }
          className="mb-10"
          description="Freshly published courses from the live catalog, ready for learners to compare and continue into details."
          eyebrow="Featured courses"
          title="Explore courses learners can start now."
        />

        {isUnavailable ? (
          <FeaturedCoursesState
            description="The catalog could not be loaded. You can still open the courses page and try again."
            title="Featured courses are unavailable"
          />
        ) : courses.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard course={course} key={course.id} />
            ))}
          </div>
        ) : (
          <FeaturedCoursesState
            description="No published courses were returned for the homepage yet."
            title="No featured courses yet"
          />
        )}
      </div>
    </section>
  );
}

type FeaturedCoursesStateProps = {
  description: string;
  title: string;
};

function FeaturedCoursesState({
  description,
  title,
}: FeaturedCoursesStateProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <ButtonLink className="mt-5" href="/courses" size="sm">
        Browse all courses
      </ButtonLink>
    </div>
  );
}
